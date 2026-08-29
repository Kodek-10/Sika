import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';

/**
 * Chaîne d'upload MVP — FRB-001 partiel.
 *
 * Ce service matérialise `POST /photos` (D9 option A) : il reçoit un fichier
 * multipart depuis le field-app et retourne une URL `storage://photos/<uuid>.ext`
 * que le client réutilise ensuite dans `POST /declarations` (`meterPhotoUrl`).
 *
 * Stockage :
 *  - Si MinIO est configuré (env `SIKA_MINIO_*`), un vrai client S3 pourrait
 *    être branché ici. Au stade MVP on persiste sur disque local dans
 *    `infra/uploads/` (monté en volume, git-ignoré).
 *  - L'URL retournée est TOUJOURS `storage://` — c'est elle que
 *    `AntiFraudService.photoIssueDuStockageInterne()` vérifie (FRB-001).
 *    Que le fichier soit sur MinIO ou sur disque ne change rien au contrat.
 *
 * Limite connue (à lever avec Dev 3) : pas de vérification HMAC/EXIF ici.
 * Voir `anti-fraud.service.ts` lignes 44-59 et IMPLEMENTATION_PLAN.md Phase 5.
 */
@Injectable()
export class PhotosService {
  private readonly uploadDir: string;

  constructor() {
    // En dev : `apps/backend/uploads` ; en prod Docker : `/data/uploads` via env.
    this.uploadDir =
      process.env.SIKA_PHOTOS_DIR ?? join(process.cwd(), 'uploads', 'photos');
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Persiste le fichier et retourne son URL canonique `storage://`.
   * Lève 400 si le fichier est absent ou d'un type non autorisé.
   */
  async save(file: Express.Multer.File | undefined): Promise<string> {
    if (!file || file.size === 0) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'ERR-400-PHOTO-REQUIRED',
        message: 'Fichier photo requis (champ `photo`)',
      });
    }

    // Garde-fou MVP : n'accepter que des images.
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'ERR-400-PHOTO-TYPE',
        message: `Type non supporté: ${file.mimetype} (image/* attendu)`,
      });
    }

    const id = randomUUID();
    const ext = extname(file.originalname) || this.extFromMime(file.mimetype);
    const filename = `${id}${ext}`;
    const filepath = join(this.uploadDir, filename);

    // `file.buffer` est disponible car on utilise `memoryStorage` côté controller.
    writeFileSync(filepath, file.buffer);

    // TODO (Phase 5 bis, avec Dev 3) : si MinIO configuré, uploader vers le bucket
    // `sika-photos` et supprimer le fichier local. L'URL retournée reste identique.

    return `storage://photos/${filename}`;
  }

  private extFromMime(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/heic': '.heic',
    };
    return map[mime] ?? '.jpg';
  }
}
