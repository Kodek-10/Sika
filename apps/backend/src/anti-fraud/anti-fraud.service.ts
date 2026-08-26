import { Injectable } from '@nestjs/common';
import type { ProofQuality } from '@sika/scoring-engine';

/** Une capture datée de plus de 48 h à la réception n'est plus plausible. */
const ANCIENNETE_MAX_HEURES = 48;

/** Tolérance d'horloge du terminal terrain — au-delà, l'horodatage est « futur ». */
const DERIVE_FUTUR_TOLEREE_MINUTES = 5;

/**
 * Préfixe du stockage objet maîtrisé par Sika (MinIO, voir infra/docker-compose.yml).
 * Une photo hors de ce namespace n'a pas transité par notre chaîne de capture.
 */
const PREFIXE_STOCKAGE_INTERNE = 'storage://';

export interface CaptureMetadata {
  photoUrl: string;
  capturedAt: Date;
  geoLat: number;
  geoLng: number;
}

/**
 * Évalue la qualité de la preuve d'une capture (INV-002, FRB-001).
 *
 * Principe : ce service ne juge QUE ce que le serveur peut vérifier lui-même.
 * Aucun flag de confiance envoyé par le client n'est accepté — SECURITY.md §4
 * (« horodatage et géolocalisation non falsifiables côté client »).
 */
@Injectable()
export class AntiFraudService {
  /**
   * @param maintenant injectable pour rendre l'évaluation déterministe en test.
   */
  evaluateProof(capture: CaptureMetadata, maintenant: Date = new Date()): ProofQuality {
    return {
      photoCapturedInApp: this.photoIssueDuStockageInterne(capture.photoUrl),
      geoLocationPresent: this.geolocalisationValide(capture.geoLat, capture.geoLng),
      timestampPlausible: this.horodatagePlausible(capture.capturedAt, maintenant),
    };
  }

  /**
   * ⚠️ VÉRIFICATION PARTIELLE — limite connue assumée au stade MVP.
   *
   * FRB-001 exige de refuser une photo qui ne vient pas de l'appareil intégré
   * à l'app. Depuis une simple URL, le serveur ne peut pas le prouver : la
   * vérification complète suppose d'inspecter les métadonnées EXIF du fichier
   * uploadé, ou de n'accepter que des uploads signés par un jeton à usage
   * unique délivré au moment de la capture.
   *
   * Ce qui est réellement vérifié ici : la photo réside bien dans le stockage
   * objet de Sika, donc elle a transité par notre chaîne d'upload et n'est pas
   * une URL arbitraire fournie par le client. C'est un filtre utile, pas une
   * garantie anti-fraude complète — et cette nuance doit être dite au jury
   * (BR-004 : ne jamais présenter comme acquis ce qui ne l'est pas).
   *
   * Renforcement prévu (à faire avec Dev 3 sur la chaîne d'upload) :
   * jeton d'upload à usage unique + contrôle EXIF côté serveur.
   */
  private photoIssueDuStockageInterne(photoUrl: string): boolean {
    return photoUrl.startsWith(PREFIXE_STOCKAGE_INTERNE);
  }

  /** Coordonnées présentes ET dans les bornes terrestres — un (0,0) accidentel ne passe pas. */
  private geolocalisationValide(lat: number, lng: number): boolean {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
    // « Null Island » : valeur par défaut typique d'un GPS non fixé.
    return !(lat === 0 && lng === 0);
  }

  /** Ni dans le futur (au-delà de la dérive d'horloge tolérée), ni trop ancienne. */
  private horodatagePlausible(capturedAt: Date, maintenant: Date): boolean {
    const ecartMs = maintenant.getTime() - capturedAt.getTime();
    const futurToleréMs = DERIVE_FUTUR_TOLEREE_MINUTES * 60 * 1000;
    const ancienneteMaxMs = ANCIENNETE_MAX_HEURES * 60 * 60 * 1000;
    return ecartMs >= -futurToleréMs && ecartMs <= ancienneteMaxMs;
  }
}
