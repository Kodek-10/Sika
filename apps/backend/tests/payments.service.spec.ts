import { BadGatewayException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  PaymentProviderUnavailableError,
  SimulatedMobileMoneyProvider,
  type MobileMoneyProvider,
} from '@sika/payments';
import type { CreatePayoutDto } from '../src/payments/dto/create-payout.dto';
import { PaymentsService } from '../src/payments/payments.service';
import type { ScoringService } from '../src/scoring/scoring.service';

const PRODUCER_ID = '11111111-1111-4111-8111-111111111111';
const AGENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PAYMENT_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const DTO: CreatePayoutDto = {
  producerId: PRODUCER_ID,
  amountFcfa: 15000,
  idempotencyKey: 'payout_cle_explicite_de_test',
};

/** Vue de score par défaut : producteur éligible. */
function vueEligible(surcharge: Record<string, unknown> = {}) {
  return {
    producerId: PRODUCER_ID,
    currentScore: 82,
    trend: 'stable',
    eligibleForPayout: true,
    lastAlert: null,
    history: [],
    eligibility: {
      threshold: 70,
      declarationCount: 5,
      minDeclarations: 3,
      blockingAlerts: [],
    },
    ...surcharge,
  };
}

interface HarnessOptions {
  vue?: ReturnType<typeof vueEligible>;
  provider?: MobileMoneyProvider;
  /** Ligne déjà présente pour cette clé d'idempotence. */
  paiementExistant?: { id: string; status: string; transaction_ref: string | null } | null;
  /** Simule une clé déjà prise au moment du INSERT (course). */
  reservationPerdue?: boolean;
}

function makeHarness(options: HarnessOptions = {}) {
  const updates: { sql: string; params: unknown[] }[] = [];
  const query = jest.fn((sql: string, params: unknown[] = []) => {
    if (sql.includes('FROM payments WHERE idempotency_key')) {
      return Promise.resolve({ rows: options.paiementExistant ? [options.paiementExistant] : [] });
    }
    if (sql.includes('phone_number FROM producers')) {
      return Promise.resolve({ rows: [{ phone_number: '+2250700000001' }] });
    }
    if (sql.includes('INSERT INTO payments')) {
      return Promise.resolve({ rows: options.reservationPerdue ? [] : [{ id: PAYMENT_ID }] });
    }
    if (sql.includes('UPDATE payments')) {
      updates.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      return Promise.resolve({ rows: [] });
    }
    return Promise.resolve({ rows: [] });
  });

  const getProducerScore = jest.fn().mockResolvedValue(options.vue ?? vueEligible());
  const scoring = { getProducerScore } as unknown as ScoringService;
  const provider = options.provider ?? new SimulatedMobileMoneyProvider();

  const service = new PaymentsService({ query } as never, scoring, provider);
  return { service, query, updates, getProducerScore, provider };
}

describe('PaymentsService — POST /payments/payout (FR-007)', () => {
  it('verse à un producteur éligible et enregistre la référence', async () => {
    const h = makeHarness();

    const res = await h.service.payout(DTO, AGENT_ID);

    expect(res.status).toBe('completed');
    expect(res.transactionRef).toMatch(/^MM-/);
    expect(res.alreadyProcessed).toBe(false);
  });

  it('réserve la ligne AVANT d appeler l opérateur', async () => {
    const ordre: string[] = [];
    const provider: MobileMoneyProvider = {
      name: 'espion',
      sendPayout: jest.fn(async () => {
        ordre.push('appel-operateur');
        return { providerStatus: 'success' as const, transactionRef: 'MM-TEST' };
      }),
    };
    const h = makeHarness({ provider });
    h.query.mockImplementation((sql: string) => {
      if (sql.includes('INSERT INTO payments')) {
        ordre.push('reservation');
        return Promise.resolve({ rows: [{ id: PAYMENT_ID }] });
      }
      if (sql.includes('phone_number FROM producers')) {
        return Promise.resolve({ rows: [{ phone_number: '+2250700000001' }] });
      }
      return Promise.resolve({ rows: [] });
    });

    await h.service.payout(DTO, AGENT_ID);

    // Si le processus meurt pendant l'appel, la trace existe déjà et la clé
    // d'idempotence empêche toute seconde tentative automatique.
    expect(ordre).toEqual(['reservation', 'appel-operateur']);
  });

  describe('BR-003 — éligibilité lue, jamais recalculée', () => {
    it('consomme getProducerScore et ne recalcule rien', async () => {
      const h = makeHarness();
      await h.service.payout(DTO, AGENT_ID);
      expect(h.getProducerScore).toHaveBeenCalledWith(PRODUCER_ID);
    });

    it('refuse un producteur non éligible sans appeler l opérateur', async () => {
      const provider: MobileMoneyProvider = { name: 'x', sendPayout: jest.fn() };
      const h = makeHarness({
        provider,
        vue: vueEligible({ eligibleForPayout: false, currentScore: 55 }),
      });

      await expect(h.service.payout(DTO, AGENT_ID)).rejects.toBeInstanceOf(ConflictException);
      expect(provider.sendPayout).not.toHaveBeenCalled();
    });

    it('explique le motif : score insuffisant', async () => {
      const h = makeHarness({
        vue: vueEligible({ eligibleForPayout: false, currentScore: 55 }),
      });
      await expect(h.service.payout(DTO, AGENT_ID)).rejects.toMatchObject({
        response: { message: expect.stringContaining('55') },
      });
    });

    it('explique le motif : alerte non résolue', async () => {
      const h = makeHarness({
        vue: vueEligible({
          eligibleForPayout: false,
          eligibility: {
            threshold: 70,
            declarationCount: 5,
            minDeclarations: 3,
            blockingAlerts: ['sur_declaration'],
          },
        }),
      });
      await expect(h.service.payout(DTO, AGENT_ID)).rejects.toMatchObject({
        response: { message: expect.stringContaining('sur_declaration') },
      });
    });

    it('explique le motif : historique insuffisant', async () => {
      const h = makeHarness({
        vue: vueEligible({
          eligibleForPayout: false,
          eligibility: {
            threshold: 70,
            declarationCount: 1,
            minDeclarations: 3,
            blockingAlerts: [],
          },
        }),
      });
      await expect(h.service.payout(DTO, AGENT_ID)).rejects.toMatchObject({
        response: { message: expect.stringContaining('1 déclaration') },
      });
    });

    it('explique le motif : aucun score encore calculé', async () => {
      const h = makeHarness({
        vue: vueEligible({ eligibleForPayout: false, currentScore: null }),
      });
      await expect(h.service.payout(DTO, AGENT_ID)).rejects.toMatchObject({
        response: { message: expect.stringContaining('Aucun score') },
      });
    });
  });

  describe('Idempotence (guide-connecteur §3) — jamais deux versements', () => {
    it('un rejeu renvoie le résultat initial sans rappeler l opérateur', async () => {
      const provider: MobileMoneyProvider = { name: 'x', sendPayout: jest.fn() };
      const h = makeHarness({
        provider,
        paiementExistant: { id: PAYMENT_ID, status: 'completed', transaction_ref: 'MM-DEJA' },
      });

      const res = await h.service.payout(DTO, AGENT_ID);

      expect(res).toEqual({
        status: 'completed',
        transactionRef: 'MM-DEJA',
        alreadyProcessed: true,
      });
      expect(provider.sendPayout).not.toHaveBeenCalled();
    });

    it('une course perdue au INSERT ne double pas le versement', async () => {
      const provider: MobileMoneyProvider = { name: 'x', sendPayout: jest.fn() };
      const h = makeHarness({ provider, reservationPerdue: true });
      // 1re lecture : rien. Après le conflit : la ligne du gagnant.
      h.query.mockImplementation((sql: string) => {
        if (sql.includes('FROM payments WHERE idempotency_key')) {
          const appels = h.query.mock.calls.filter((c) =>
            String(c[0]).includes('FROM payments WHERE idempotency_key'),
          ).length;
          return Promise.resolve({
            rows:
              appels > 1
                ? [{ id: PAYMENT_ID, status: 'completed', transaction_ref: 'MM-GAGNANT' }]
                : [],
          });
        }
        if (sql.includes('phone_number FROM producers')) {
          return Promise.resolve({ rows: [{ phone_number: '+2250700000001' }] });
        }
        if (sql.includes('INSERT INTO payments')) {
          return Promise.resolve({ rows: [] }); // ON CONFLICT DO NOTHING
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await h.service.payout(DTO, AGENT_ID);

      expect(res.alreadyProcessed).toBe(true);
      expect(res.transactionRef).toBe('MM-GAGNANT');
      expect(provider.sendPayout).not.toHaveBeenCalled();
    });
  });

  describe('Checkpoint et quarantaine (guide-connecteur §3)', () => {
    it('une confirmation différée reste `initiated`, jamais `completed` par optimisme', async () => {
      const h = makeHarness({
        provider: new SimulatedMobileMoneyProvider({ confirmationDifferee: true }),
      });

      const res = await h.service.payout(DTO, AGENT_ID);

      expect(res.status).toBe('initiated');
      const update = h.updates.find((u) => u.sql.startsWith('UPDATE payments'));
      expect(update?.params).toContain('initiated');
    });

    it('un opérateur indisponible ⇒ ERR-502 et paiement en quarantaine', async () => {
      const h = makeHarness({
        provider: new SimulatedMobileMoneyProvider({ comportement: 'indisponible' }),
      });

      await expect(h.service.payout(DTO, AGENT_ID)).rejects.toBeInstanceOf(BadGatewayException);

      // La raison est conservée pour permettre une reprise MANUELLE.
      const quarantaine = h.updates.find((u) => u.sql.includes("status = 'failed'"));
      expect(quarantaine).toBeDefined();
      expect(String(quarantaine?.params[1])).toContain('indisponible');
    });

    it('ne relance JAMAIS automatiquement après un échec opérateur', async () => {
      const sendPayout = jest
        .fn()
        .mockRejectedValue(new PaymentProviderUnavailableError('operateur'));
      const h = makeHarness({ provider: { name: 'operateur', sendPayout } });

      await expect(h.service.payout(DTO, AGENT_ID)).rejects.toBeInstanceOf(BadGatewayException);

      // Un seul appel : le risque de double versement interdit tout retry auto.
      expect(sendPayout).toHaveBeenCalledTimes(1);
    });

    it('un refus de l opérateur enregistre le détail sans lever 502', async () => {
      const h = makeHarness({
        provider: new SimulatedMobileMoneyProvider({ comportement: 'refus' }),
      });

      const res = await h.service.payout(DTO, AGENT_ID);

      expect(res.status).toBe('failed');
      const update = h.updates.find((u) => u.sql.startsWith('UPDATE payments'));
      expect(update?.params).toContain('failed');
    });
  });

  it('renvoie ERR-404 si le producteur est inconnu', async () => {
    const h = makeHarness();
    h.query.mockImplementation((sql: string) => {
      if (sql.includes('phone_number FROM producers')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    await expect(h.service.payout(DTO, AGENT_ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('sans clé explicite, dérive une clé stable pour la même intention', async () => {
    const h = makeHarness();
    const sansCle: CreatePayoutDto = { producerId: PRODUCER_ID, amountFcfa: 15000 };

    await h.service.payout(sansCle, AGENT_ID);

    const insert = h.query.mock.calls.find((c) => String(c[0]).includes('INSERT INTO payments'));
    expect(String(insert?.[1]?.[2])).toMatch(/^payout_[0-9a-f]{32}$/);
  });
});
