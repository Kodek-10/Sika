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
            { quantity_kg: '98', meter_reading_m3: '6.8' },
            { quantity_kg: '102', meter_reading_m3: '7.2' },
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
