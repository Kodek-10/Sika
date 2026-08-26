import { ForbiddenException } from '@nestjs/common';
import { AntiFraudService } from '../src/anti-fraud/anti-fraud.service';
import type { AuthenticatedUser } from '../src/auth/guards';
import { DeclarationsService } from '../src/declarations/declarations.service';
import type { CreateDeclarationDto } from '../src/declarations/dto/create-declaration.dto';
import type { ScoringService } from '../src/scoring/scoring.service';

const DECLARATION_ID = '22222222-2222-4222-8222-222222222222';
const PRODUCER_ID = '11111111-1111-4111-8111-111111111111';

const DTO: CreateDeclarationDto = {
  declarationId: DECLARATION_ID,
  producerId: PRODUCER_ID,
  substrate: 'fientes_volaille',
  quantityKg: 3.5,
  durationHours: 24,
  meterReadingM3: 0.19,
  meterPhotoUrl: 'storage://photos/uuid.jpg',
  capturedAt: new Date().toISOString(),
  geoLocation: { lat: 7.69, lng: -5.03 },
};

const AGENT: AuthenticatedUser = { userId: 'u-agent', role: 'agent' };
const PRODUCTEUR: AuthenticatedUser = {
  userId: 'u-prod',
  role: 'producteur',
  producerId: PRODUCER_ID,
};

function makeHarness(options: { scoreAlerts?: { type: string }[] } = {}) {
  const query = jest.fn().mockResolvedValue({ rows: [] });
  const txQuery = jest.fn().mockResolvedValue({ rows: [] });
  const withTransaction = jest.fn(async (work: (q: unknown) => Promise<void>) => {
    await work(txQuery);
  });
  const db = { query, withTransaction };

  const computeForDeclaration = jest.fn().mockResolvedValue({
    score: 82,
    signals: {
      signal_intrant_extrant: 100,
      signal_temporel: 100,
      signal_capacite: 100,
      signal_preuve: 100,
    },
    alerts: options.scoreAlerts ?? [],
  });
  const persistWithin = jest.fn().mockResolvedValue(undefined);
  const scoring = { computeForDeclaration, persistWithin } as unknown as ScoringService;

  const service = new DeclarationsService(
    db as never,
    scoring,
    new AntiFraudService(),
  );
  return { service, db, query, txQuery, withTransaction, computeForDeclaration, persistWithin };
}

describe('DeclarationsService — POST /declarations (FR-001, FR-002)', () => {
  it('persiste déclaration + relevé + score dans UNE seule transaction', async () => {
    const h = makeHarness();

    const res = await h.service.create(DTO, AGENT);

    expect(res).toMatchObject({
      declarationId: DECLARATION_ID,
      status: 'received',
      scoreUpdated: true,
      alertTriggered: false,
    });
    expect(h.withTransaction).toHaveBeenCalledTimes(1);

    const inserts = h.txQuery.mock.calls.map((c) => String(c[0]).replace(/\s+/g, ' ').trim());
    expect(inserts.some((t) => t.startsWith('INSERT INTO declarations'))).toBe(true);
    expect(inserts.some((t) => t.startsWith('INSERT INTO meter_readings'))).toBe(true);
    // Le score est écrit par le service de scoring DANS la même transaction,
    // avec le rattachement de l'alerte à SA déclaration (migration 0006).
    expect(h.persistWithin).toHaveBeenCalledWith(
      h.txQuery,
      PRODUCER_ID,
      expect.anything(),
      DECLARATION_ID,
    );
  });

  it("l'identifiant client devient l'id de déclaration (idempotence par construction)", async () => {
    const h = makeHarness();
    await h.service.create(DTO, AGENT);

    const insertDecl = h.txQuery.mock.calls.find((c) =>
      String(c[0]).includes('INSERT INTO declarations'),
    );
    expect(insertDecl?.[1]?.[0]).toBe(DECLARATION_ID);
  });

  it('signale une alerte déclenchée', async () => {
    const h = makeHarness({ scoreAlerts: [{ type: 'sur_declaration' }] });
    const res = await h.service.create(DTO, AGENT);
    expect(res.alertTriggered).toBe(true);
  });

  it('calcule AVANT d écrire : un refus de scoring ne persiste rien', async () => {
    const h = makeHarness();
    (h.computeForDeclaration as jest.Mock).mockRejectedValue(new Error('substrat inconnu'));

    await expect(h.service.create(DTO, AGENT)).rejects.toThrow();
    expect(h.withTransaction).not.toHaveBeenCalled();
  });

  describe('idempotence (guide-connecteur §2)', () => {
    it('un rejeu du même identifiant ne crée pas de doublon', async () => {
      const h = makeHarness();
      h.query.mockResolvedValue({ rows: [{ id: DECLARATION_ID, alertes: '0' }] });

      const res = await h.service.create(DTO, AGENT);

      expect(res.status).toBe('already_received');
      expect(res.scoreUpdated).toBe(false);
      expect(h.withTransaction).not.toHaveBeenCalled();
      expect(h.computeForDeclaration).not.toHaveBeenCalled();
    });

    it('une course entre deux synchronisations renvoie le résultat du gagnant', async () => {
      const h = makeHarness();
      // 1er appel (vérif d'existence) : absent. 2e appel (après conflit) : présent.
      h.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValue({ rows: [{ id: DECLARATION_ID, alertes: '0' }] });
      h.withTransaction.mockRejectedValue(
        Object.assign(new Error('duplicate key'), { code: '23505' }),
      );

      const res = await h.service.create(DTO, AGENT);

      expect(res.status).toBe('already_received');
    });
  });

  describe('autorisation (FR-006, FRB-008)', () => {
    it('un producteur peut déclarer pour lui-même', async () => {
      const h = makeHarness();
      await expect(h.service.create(DTO, PRODUCTEUR)).resolves.toMatchObject({
        status: 'received',
      });
    });

    it('un producteur ne peut PAS déclarer pour un autre', async () => {
      const h = makeHarness();
      const autre: AuthenticatedUser = {
        userId: 'u-autre',
        role: 'producteur',
        producerId: '99999999-9999-4999-8999-999999999999',
      };

      await expect(h.service.create(DTO, autre)).rejects.toBeInstanceOf(ForbiddenException);
      expect(h.withTransaction).not.toHaveBeenCalled();
    });

    it("un agent déclare pour n'importe quel producteur de sa zone", async () => {
      const h = makeHarness();
      await expect(h.service.create(DTO, AGENT)).resolves.toMatchObject({
        status: 'received',
      });
    });
  });

  describe('GET /declarations/:producerId (FR-005)', () => {
    it('mappe l historique en camelCase', async () => {
      const h = makeHarness();
      const declaredAt = new Date('2026-08-15T08:00:00Z');
      h.query.mockResolvedValue({
        rows: [
          {
            id: DECLARATION_ID,
            substrate: 'fientes_volaille',
            quantity_kg: '3.5',
            duration_hours: '24',
            declared_at: declaredAt,
            value_m3: '0.19',
            captured_at: declaredAt,
          },
        ],
      });

      const res = await h.service.findByProducer(PRODUCER_ID, AGENT);

      expect(res).toEqual([
        {
          declarationId: DECLARATION_ID,
          substrate: 'fientes_volaille',
          quantityKg: 3.5,
          durationHours: 24,
          declaredAt,
          meterReadingM3: 0.19,
          capturedAt: declaredAt,
        },
      ]);
    });

    it('un producteur ne consulte pas l historique d un autre', async () => {
      const h = makeHarness();
      const autre: AuthenticatedUser = {
        userId: 'u-autre',
        role: 'producteur',
        producerId: '99999999-9999-4999-8999-999999999999',
      };
      await expect(h.service.findByProducer(PRODUCER_ID, autre)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
