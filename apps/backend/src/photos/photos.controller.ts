import {
  Controller,
  HttpCode,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Roles } from '../auth/guards';
import { PhotosService } from './photos.service';

/** Taille max MVP : 5 Mo — au-delà, le field-app doit compresser côté client. */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/**
 * `POST /photos` — D9 option A.
 *
 * Flux : field-app capture → `POST /photos` (multipart `photo`) → `{ photoUrl }`
 *        → `POST /declarations` avec `meterPhotoUrl: photoUrl`.
 *
 * L'URL retournée est `storage://photos/<uuid>.ext` ; c'est elle que
 * `AntiFraudService` valide (FRB-001). Pas de HMAC/EXIF au stade MVP
 * (voir `photos.service.ts` et `IMPLEMENTATION_PLAN.md` Phase 5).
 */
@Controller('photos')
export class PhotosController {
  constructor(private photos: PhotosService) {}

  @Post()
  @Roles('producteur', 'agent')
  @HttpCode(201)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    const photoUrl = await this.photos.save(file);
    return { photoUrl };
  }
}
