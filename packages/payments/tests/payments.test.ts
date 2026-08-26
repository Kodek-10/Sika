/**
 * Tests du module de paiement — cas obligatoires du guide-connecteur §3.
 * L'idempotence est le cas le plus sensible ici : un doublon, c'est de
 * l'argent versé deux fois, irrattrapable.
 */

import {
  FENETRE_IDEMPOTENCE_MINUTES,
  PaymentProviderUnavailableError,
  SimulatedMobileMoneyProvider,
  deriveLocalTransactionRef,
  derivePayoutIdempotencyKey,
  toPaymentStatus,
} from '../src';

const PRODUCER = '11111111-1111-4111-8111-111111111111';
const AUTRE_PRODUCER = '99999999-9999-4999-8999-999999999999';
const T = new Date('2026-08-15T10:00:00Z');

describe('Idempotence des versements (guide-connecteur §3)', () => {
  it('deux demandes identiques dans la même fenêtre ⇒ même clé', () => {
    const a = derivePayoutIdempotencyKey(PRODUCER, 15000, T);
    const b = derivePayoutIdempotencyKey(PRODUCER, 15000, new Date(T.getTime() + 5 * 60_000));
    expect(a).toBe(b);
  });

  it('un double clic à la seconde près ⇒ même clé', () => {
    const a = derivePayoutIdempotencyKey(PRODUCER, 15000, T);
    const b = derivePayoutIdempotencyKey(PRODUCER, 15000, new Date(T.getTime() + 800));
    expect(a).toBe(b);
  });

  it('un montant différent ⇒ clé différente (versement légitimement distinct)', () => {
    expect(derivePayoutIdempotencyKey(PRODUCER, 15000, T)).not.toBe(
      derivePayoutIdempotencyKey(PRODUCER, 20000, T),
    );
  });

  it('un producteur différent ⇒ clé différente', () => {
    expect(derivePayoutIdempotencyKey(PRODUCER, 15000, T)).not.toBe(
      derivePayoutIdempotencyKey(AUTRE_PRODUCER, 15000, T),
    );
  });

  it('la clé ne révèle ni le producteur ni le montant (elle peut finir dans un log)', () => {
    const cle = derivePayoutIdempotencyKey(PRODUCER, 15000, T);
    expect(cle).toMatch(/^payout_[0-9a-f]{32}$/);
    expect(cle).not.toContain(PRODUCER);
    expect(cle).not.toContain('15000');
  });

  it('LIMITE ASSUMÉE : deux demandes de part et d autre d une frontière de fenêtre diffèrent', () => {
    // Documenté explicitement plutôt que caché : c'est la raison d'être des
    // deux autres filets (clé explicite de l'appelant + contrainte unique DB).
    const fenetreMs = FENETRE_IDEMPOTENCE_MINUTES * 60 * 1000;
    const avant = new Date(Math.floor(T.getTime() / fenetreMs) * fenetreMs - 1);
    const apres = new Date(avant.getTime() + 2);

    expect(derivePayoutIdempotencyKey(PRODUCER, 15000, avant)).not.toBe(
      derivePayoutIdempotencyKey(PRODUCER, 15000, apres),
    );
  });
});

describe('Référence de transaction locale', () => {
  it('est déterministe pour une même intention', () => {
    const cle = derivePayoutIdempotencyKey(PRODUCER, 15000, T);
    expect(deriveLocalTransactionRef(cle)).toBe(deriveLocalTransactionRef(cle));
  });

  it('respecte le format MM-xxxx du contrat API', () => {
    const ref = deriveLocalTransactionRef(derivePayoutIdempotencyKey(PRODUCER, 15000, T));
    expect(ref).toMatch(/^MM-[0-9A-F]{12}$/);
  });
});

describe('Cartographie des statuts (guide-connecteur §3)', () => {
  it('success ⇒ completed', () => {
    expect(toPaymentStatus('success')).toBe('completed');
  });

  it('pending reste initiated — jamais de completed optimiste (règle du checkpoint)', () => {
    expect(toPaymentStatus('pending')).toBe('initiated');
  });

  it('failed ⇒ failed', () => {
    expect(toPaymentStatus('failed')).toBe('failed');
  });
});

describe('Opérateur simulé', () => {
  const requete = {
    producerId: PRODUCER,
    phoneNumber: '+2250700000001',
    amountFcfa: 15000,
    idempotencyKey: derivePayoutIdempotencyKey(PRODUCER, 15000, T),
  };

  it('verse et confirme par défaut', async () => {
    const ack = await new SimulatedMobileMoneyProvider().sendPayout(requete);

    expect(ack.providerStatus).toBe('success');
    expect(ack.transactionRef).toMatch(/^MM-/);
  });

  it('est déterministe — même intention, même référence (INV-005 dans l esprit)', async () => {
    const provider = new SimulatedMobileMoneyProvider();
    const a = await provider.sendPayout(requete);
    const b = await provider.sendPayout(requete);

    expect(a.transactionRef).toBe(b.transactionRef);
  });

  it('peut simuler une confirmation différée', async () => {
    const ack = await new SimulatedMobileMoneyProvider({
      confirmationDifferee: true,
    }).sendPayout(requete);

    expect(ack.providerStatus).toBe('pending');
    expect(toPaymentStatus(ack.providerStatus)).toBe('initiated');
  });

  it('peut simuler un refus de l opérateur', async () => {
    const ack = await new SimulatedMobileMoneyProvider({ comportement: 'refus' }).sendPayout(
      requete,
    );

    expect(ack.providerStatus).toBe('failed');
    expect(ack.failureDetail).toBeTruthy();
  });

  it('peut simuler une indisponibilité ⇒ ERR-502 (chemin jouable en démo)', async () => {
    const provider = new SimulatedMobileMoneyProvider({ comportement: 'indisponible' });

    await expect(provider.sendPayout(requete)).rejects.toBeInstanceOf(
      PaymentProviderUnavailableError,
    );
    await expect(provider.sendPayout(requete)).rejects.toMatchObject({
      code: 'ERR-502-PAYMENT-PROVIDER-UNAVAILABLE',
    });
  });
});
