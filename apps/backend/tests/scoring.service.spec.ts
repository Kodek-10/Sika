import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { ScoreResult } from '@sika/scoring-engine';
import { ScoringService } from '../src/scoring/scoring.service';
import { YieldModelAdapter } from '../src/scoring/yield-model.adapter';

type QueryFn = jest.Mock;
type TxQueryFn = jest.Mock;

function makeDb() {
  const query: QueryFn = jest.fn();
  const withTransaction = jest.fn(async (work: (q: unknown) => Promise<void>) => {
    const txQuery: TxQueryFn = jest.fn();
    await work(txQuery);
    return txQuery;
  });
  return { query, withTransaction };
}

const PRODUCER_ID = '11111111-1111-4111-8111-111111111111';
const ALERT_ID = '33333333-3333-4333-8333-333333333333';

const PROOF_OK = {
  photoCapturedInApp: true,
  geoLocationPresent: true,
  timestampPlausible: true,
};

/** Déclaration parfaitement dans la fourchette attendue. */
const DECLARATION_CONFORME = {
  substrate: 'fientes_volaille',
  quantityKg: 100,
  durationHours: 24,
  meterReadingM3: 7, // fourchette mockée [5, 9] → dans la tolérance
};

describe('ScoringService — orchestration', () => {
  function makeService(db = makeDb(), estimate?: QueryFn) {
    const estimateMock =
      estimate ??
      (jest.fn().mockResolvedValue({
        minM3: 5,
        maxM3: 9,
        reliability: 'basse',
      }) as QueryFn);
    const yieldModel = {
      estimateExpectedYield: estimateMock,
    } as unknown as YieldModelAdapter;
    return { service: new ScoringService(db as never, yieldModel), db, estimate: estimateMock };
  }

  function givenProducer(db: ReturnType<typeof makeDb>, capacity = '500') {
    db.query.mockImplementation((text: string) => {
      if (text.includes('FROM producers')) {
        return Promise.resolve({
          rows: [{ capacity_declared: capacity, climate_zone: 'sud' }],
        });
      }
      if (text.includes('FROM declarations')) {
        return Promise.resolve({
          rows: [
            { quantity_kg: '98', value_m3: '6.8' },
            { quantity_kg: '102', value_m3: '7.2' },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });
  }

  it('calcule le score et persiste scores + alertes dans une transaction', async () => {
    const { service, db } = makeService();
    givenProducer(db);

    const result = await service.scoreDeclaration(PRODUCER_ID, DECLARATION_CONFORME, PROOF_OK);

    // Lecture conforme : signal intrant/extrant à 100, aucune alerte.
    expect(result.signals.signal_intrant_extrant).toBe(100);
    expect(result.alerts).toHaveLength(0);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);

    // Persistance : une transaction, un INSERT scores, aucun INSERT alerts.
    const work = db.withTransaction.mock.calls[0][0] as (q: QueryFn) => Promise<unknown>;
    await work(jest.fn());
    expect(db.withTransaction).toHaveBeenCalledTimes(1);
  });

  it("propage l'historique au moteur dans l'ordre chronologique", async () => {
    const { service, db, estimate } = makeService();
    givenProducer(db);

    await service.scoreDeclaration(PRODUCER_ID, DECLARATION_CONFORME, PROOF_OK);

    // L'adaptateur a bien été appelé avec la zone climatique du producteur.
    expect(estimate).toHaveBeenCalledWith('fientes_volaille', 100, 'sud');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM declarations'),
      expect.arrayContaining([PRODUCER_ID]),
    );
  });

  it('persiste les alertes produites par le moteur (sur-déclaration flagrante)', async () => {
    const { service, db } = makeService();
    givenProducer(db);
    const txInserts: string[] = [];
    db.withTransaction.mockImplementation(async (work: (q: QueryFn) => Promise<unknown>) => {
      const txQuery: QueryFn = jest.fn((text: string) => {
        txInserts.push(text.replace(/\s+/g, ' ').trim());
        return Promise.resolve({ rows: [] });
      });
      await work(txQuery);
      return txQuery;
    });

    // Lecture +300 % au-dessus de maxM3 → BR-002.
    const result: ScoreResult = await service.scoreDeclaration(
      PRODUCER_ID,
      { ...DECLARATION_CONFORME, meterReadingM3: 36 },
      PROOF_OK,
    );

    expect(result.alerts.map((a) => a.type)).toContain('sur_declaration');
    expect(txInserts.some((t) => t.startsWith('INSERT INTO scores'))).toBe(true);
    expect(txInserts.some((t) => t.startsWith('INSERT INTO alerts'))).toBe(true);
  });

  it('renvoie ERR-404 si le producteur est inconnu', async () => {
    const { service, db } = makeService();
    db.query.mockResolvedValue({ rows: [] });

    await expect(
      service.scoreDeclaration(PRODUCER_ID, DECLARATION_CONFORME, PROOF_OK),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('propage le refus de substrat inconnu (ERR-422) sans persister', async () => {
    const freshDb = makeDb();
    const { service, db } = makeService(
      freshDb,
      jest.fn().mockRejectedValue(new UnprocessableEntityException()) as QueryFn,
    );
    givenProducer(freshDb);

    await expect(
      service.scoreDeclaration(PRODUCER_ID, DECLARATION_CONFORME, PROOF_OK),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(db.withTransaction).not.toHaveBeenCalled();
  });
});

describe('ScoringService — listAlerts (GET /alerts)', () => {
  function makeServiceWithAlerts(rows: unknown[]) {
    const db = makeDb();
    db.query.mockResolvedValue({ rows });
    const service = new ScoringService(db as never, {} as never);
    return { service, db };
  }

  it('renvoie les alertes mappées en camelCase, plus récentes d abord', async () => {
    const detected = new Date('2026-08-14T10:00:00Z');
    const { service, db } = makeServiceWithAlerts([
      {
        id: ALERT_ID,
        producer_id: PRODUCER_ID,
        type: 'sur_declaration',
        severity: 'high',
        detail: 'Lecture compteur +112 % au-dessus de la fourchette attendue',
        detected_at: detected,
        resolved: false,
        declaration_id: null,
      },
    ]);

    const alerts = await service.listAlerts();

    expect(alerts).toEqual([
      {
        alertId: ALERT_ID,
        producerId: PRODUCER_ID,
        type: 'sur_declaration',
        severity: 'high',
        detectedAt: detected,
        detail: 'Lecture compteur +112 % au-dessus de la fourchette attendue',
        resolved: false,
        declarationId: null,
      },
    ]);
    // Tri côté SQL : la requête doit porter le ORDER BY détect_at DESC.
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY detected_at DESC'),
      expect.anything(),
    );
  });

  it('renvoie une liste vide sans alerte — pas une 404', async () => {
    const { service } = makeServiceWithAlerts([]);

    await expect(service.listAlerts()).resolves.toEqual([]);
  });

  it('filtre les alertes ACTIVES par défaut (FR-010)', async () => {
    const { service, db } = makeServiceWithAlerts([]);

    await service.listAlerts();

    // Le filtre passe en PARAMÈTRE, jamais concaténé (SECURITY.md §4).
    const [, params] = db.query.mock.calls[0];
    expect(params).toContain(false);
  });

  it('?resolved=all lève le filtre', async () => {
    const { service, db } = makeServiceWithAlerts([]);

    await service.listAlerts('all');

    const [, params] = db.query.mock.calls[0];
    expect(params).toContain(null);
  });
});

describe('ScoringService — resolveAlert (prérequis BR-003)', () => {
  const ligne = (resolved: boolean) => ({
    id: ALERT_ID,
    producer_id: PRODUCER_ID,
    type: 'maintenance',
    severity: 'medium',
    detail: 'Entretien probable',
    detected_at: new Date('2026-08-14T10:00:00Z'),
    resolved,
    declaration_id: null,
  });

  it('marque l alerte comme traitée', async () => {
    const db = makeDb();
    db.query.mockResolvedValue({ rows: [ligne(true)] });
    const service = new ScoringService(db as never, {} as never);

    await expect(service.resolveAlert(ALERT_ID)).resolves.toMatchObject({
      alertId: ALERT_ID,
      resolved: true,
    });
  });

  it('est idempotent : résoudre deux fois ne casse pas', async () => {
    const db = makeDb();
    db.query.mockResolvedValue({ rows: [ligne(true)] });
    const service = new ScoringService(db as never, {} as never);

    const a = await service.resolveAlert(ALERT_ID);
    const b = await service.resolveAlert(ALERT_ID);
    expect(a).toEqual(b);
  });

  it('renvoie 404 sur une alerte inexistante', async () => {
    const db = makeDb();
    db.query.mockResolvedValue({ rows: [] });
    const service = new ScoringService(db as never, {} as never);

    await expect(service.resolveAlert(ALERT_ID)).rejects.toBeInstanceOf(NotFoundException);
  });
});

/**
 * BR-003 — éligibilité au versement Mobile Money.
 * C'est le SEUL endroit où l'éligibilité est décidée : `packages/payments/`
 * la consomme et ne la recalcule jamais.
 */
describe('ScoringService — getProducerScore & éligibilité BR-003', () => {
  interface EtatProducteur {
    scores?: number[];
    declarations?: number;
    alertesActives?: string[];
  }

  function makeScoreService({
    scores = [82, 80],
    declarations = 5,
    alertesActives = [],
  }: EtatProducteur = {}) {
    const db = makeDb();
    db.query.mockImplementation((text: string) => {
      if (text.includes('FROM producers')) {
        return Promise.resolve({
          rows: [{ capacity_declared: '30', climate_zone: 'sud' }],
        });
      }
      if (text.includes('FROM scores')) {
        // Plus récent d'abord, comme le fait le ORDER BY computed_at DESC.
        return Promise.resolve({
          rows: scores.map((value, i) => ({
            value: String(value),
            computed_at: new Date(`2026-08-${String(20 - i).padStart(2, '0')}T10:00:00Z`),
          })),
        });
      }
      if (text.includes('count(*) AS total')) {
        return Promise.resolve({ rows: [{ total: String(declarations) }] });
      }
      if (text.includes('SELECT DISTINCT type')) {
        return Promise.resolve({ rows: alertesActives.map((type) => ({ type })) });
      }
      if (text.includes('FROM alerts')) {
        return Promise.resolve({ rows: [] }); // lastAlert
      }
      return Promise.resolve({ rows: [] });
    });
    return new ScoringService(db as never, {} as never);
  }

  it('producteur sain au-dessus du seuil ⇒ éligible', async () => {
    const vue = await makeScoreService().getProducerScore(PRODUCER_ID);

    expect(vue.currentScore).toBe(82);
    expect(vue.eligibleForPayout).toBe(true);
    expect(vue.eligibility.threshold).toBe(70);
  });

  it('score sous le seuil ⇒ non éligible', async () => {
    const vue = await makeScoreService({ scores: [65, 64] }).getProducerScore(PRODUCER_ID);

    expect(vue.eligibleForPayout).toBe(false);
  });

  it('démarrage à froid : trop peu de déclarations ⇒ non éligible (D2)', async () => {
    const vue = await makeScoreService({ declarations: 1 }).getProducerScore(PRODUCER_ID);

    expect(vue.eligibleForPayout).toBe(false);
    expect(vue.eligibility.declarationCount).toBe(1);
  });

  it('alerte sur_declaration non résolue ⇒ BLOQUE le versement', async () => {
    const vue = await makeScoreService({
      alertesActives: ['sur_declaration'],
    }).getProducerScore(PRODUCER_ID);

    expect(vue.eligibleForPayout).toBe(false);
    expect(vue.eligibility.blockingAlerts).toContain('sur_declaration');
  });

  it('alerte maintenance non résolue ne bloque PAS (BR-001 : sous-performance ≠ fraude)', async () => {
    const vue = await makeScoreService({
      alertesActives: ['maintenance'],
    }).getProducerScore(PRODUCER_ID);

    // D3 = false : punir une sous-performance reviendrait à traiter un
    // producteur mal équipé comme un fraudeur.
    expect(vue.eligibleForPayout).toBe(true);
    expect(vue.eligibility.blockingAlerts).toEqual([]);
  });

  it('aucun score encore calculé ⇒ non éligible, pas une erreur', async () => {
    const vue = await makeScoreService({ scores: [] }).getProducerScore(PRODUCER_ID);

    expect(vue.currentScore).toBeNull();
    expect(vue.eligibleForPayout).toBe(false);
    expect(vue.trend).toBe('stable');
  });

  describe('tendance', () => {
    it('hausse nette', async () => {
      const vue = await makeScoreService({ scores: [90, 80] }).getProducerScore(PRODUCER_ID);
      expect(vue.trend).toBe('hausse');
    });

    it('baisse nette', async () => {
      const vue = await makeScoreService({ scores: [70, 85] }).getProducerScore(PRODUCER_ID);
      expect(vue.trend).toBe('baisse');
    });

    it('variation mineure ⇒ stable', async () => {
      const vue = await makeScoreService({ scores: [82, 80] }).getProducerScore(PRODUCER_ID);
      expect(vue.trend).toBe('stable');
    });
  });

  it("l'historique est renvoyé du plus ancien au plus récent", async () => {
    const vue = await makeScoreService({ scores: [82, 80, 78] }).getProducerScore(PRODUCER_ID);

    expect(vue.history.map((h) => h.score)).toEqual([78, 80, 82]);
    expect(vue.history[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('YieldModelAdapter — contrat D6', () => {
  function makeAdapter(query: QueryFn) {
    return new YieldModelAdapter({ query } as never);
  }

  it('applique quantité × rendement/kg × coefficient climatique', async () => {
    const query: QueryFn = jest.fn().mockResolvedValue({
      rows: [
        {
          min_m3_per_kg: '0.050',
          max_m3_per_kg: '0.090',
          reliability: 'basse',
          climate_coefficient_sud: '1.00',
          climate_coefficient_nord: '1.10',
        },
      ],
    });
    const adapter = makeAdapter(query);

    const sud = await adapter.estimateExpectedYield('fientes_volaille', 100, 'sud');
    expect(sud).toEqual({ minM3: 5, maxM3: 9, reliability: 'basse' });

    const nord = await adapter.estimateExpectedYield('fientes_volaille', 100, 'nord');
    expect(nord.minM3).toBeCloseTo(5.5);
    expect(nord.maxM3).toBeCloseTo(9.9);
  });

  it('échoue avec ERR-422 sur substrat inconnu (INV-004)', async () => {
    const adapter = makeAdapter(jest.fn().mockResolvedValue({ rows: [] }));

    await expect(
      adapter.estimateExpectedYield('substrate_inconnu', 100, 'sud'),
    ).rejects.toMatchObject({
      status: 422,
      response: { statusCode: 422, error: 'ERR-422-UNKNOWN-SUBSTRATE' },
    });
  });
});
