import { AntiFraudService } from '../src/anti-fraud/anti-fraud.service';

/**
 * Qualité de preuve (INV-002, FRB-001).
 * Règle de fond : le serveur ne juge que ce qu'il peut vérifier lui-même —
 * aucun flag de confiance envoyé par le client n'est accepté (SECURITY.md §4).
 */
describe('AntiFraudService — qualité de la preuve', () => {
  const service = new AntiFraudService();
  const MAINTENANT = new Date('2026-08-15T12:00:00Z');

  const capture = (surcharge: Partial<Parameters<typeof service.evaluateProof>[0]> = {}) => ({
    photoUrl: 'storage://photos/abc.jpg',
    capturedAt: new Date('2026-08-15T11:30:00Z'),
    geoLat: 7.69,
    geoLng: -5.03,
    ...surcharge,
  });

  it('capture nominale ⇒ preuve complète', () => {
    expect(service.evaluateProof(capture(), MAINTENANT)).toEqual({
      photoCapturedInApp: true,
      geoLocationPresent: true,
      timestampPlausible: true,
    });
  });

  describe('origine de la photo (FRB-001)', () => {
    it('refuse une URL hors du stockage Sika', () => {
      const proof = service.evaluateProof(
        capture({ photoUrl: 'https://example.com/photo-de-la-galerie.jpg' }),
        MAINTENANT,
      );
      expect(proof.photoCapturedInApp).toBe(false);
    });

    it('accepte une photo du stockage interne', () => {
      const proof = service.evaluateProof(
        capture({ photoUrl: 'storage://photos/uuid.jpg' }),
        MAINTENANT,
      );
      expect(proof.photoCapturedInApp).toBe(true);
    });
  });

  describe('géolocalisation (INV-002)', () => {
    it('refuse « Null Island » (0,0) — GPS non fixé', () => {
      const proof = service.evaluateProof(capture({ geoLat: 0, geoLng: 0 }), MAINTENANT);
      expect(proof.geoLocationPresent).toBe(false);
    });

    it('refuse des coordonnées hors bornes terrestres', () => {
      expect(
        service.evaluateProof(capture({ geoLat: 120 }), MAINTENANT).geoLocationPresent,
      ).toBe(false);
    });

    it('refuse NaN', () => {
      expect(
        service.evaluateProof(capture({ geoLat: Number.NaN }), MAINTENANT)
          .geoLocationPresent,
      ).toBe(false);
    });
  });

  describe('horodatage (INV-002)', () => {
    it('refuse un horodatage dans le futur au-delà de la dérive tolérée', () => {
      const proof = service.evaluateProof(
        capture({ capturedAt: new Date('2026-08-15T13:00:00Z') }),
        MAINTENANT,
      );
      expect(proof.timestampPlausible).toBe(false);
    });

    it('tolère une légère avance d horloge du terminal terrain', () => {
      const proof = service.evaluateProof(
        capture({ capturedAt: new Date('2026-08-15T12:02:00Z') }),
        MAINTENANT,
      );
      expect(proof.timestampPlausible).toBe(true);
    });

    it('accepte une capture hors-ligne synchronisée le lendemain (FR-008)', () => {
      const proof = service.evaluateProof(
        capture({ capturedAt: new Date('2026-08-14T12:00:00Z') }),
        MAINTENANT,
      );
      expect(proof.timestampPlausible).toBe(true);
    });

    it('refuse une capture de plus de 48 h', () => {
      const proof = service.evaluateProof(
        capture({ capturedAt: new Date('2026-08-12T11:00:00Z') }),
        MAINTENANT,
      );
      expect(proof.timestampPlausible).toBe(false);
    });
  });
});
