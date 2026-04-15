import { Injectable, NotFoundException } from '@nestjs/common';
import { StoreService } from '../store/store.service';

@Injectable()
export class ImageService {
  constructor(private readonly store: StoreService) {}

  saveImages(aplId: string, files: Express.Multer.File[]) {
    const apl = this.store.findApl(aplId);
    if (!apl) throw new NotFoundException(`APL ${aplId} not found`);

    return files.map((file) =>
      this.store.createImage({
        aplId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
      }),
    );
  }

  findByApl(aplId: string) {
    return this.store.findImagesByApl(aplId);
  }
}
