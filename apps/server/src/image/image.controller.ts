import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';
import { ImageService } from './image.service';
import { ProcessingService } from '../processing/processing.service';

@Controller()
export class ImageController {
  constructor(
    private readonly imageService: ImageService,
    private readonly processingService: ProcessingService,
  ) {}

  @Post('apls/:id/images')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (_req, file, cb) => {
          cb(null, `${uuidv4()}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const allowed = /image\/(jpeg|jpg|png|webp)/;
        cb(null, allowed.test(file.mimetype));
      },
    }),
  )
  async uploadImages(
    @Param('id') aplId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const images = await this.imageService.saveImages(aplId, files);
    this.processingService.processApl(aplId).catch(console.error);
    return images;
  }

  @Get('uploads/:filename')
  serveImage(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(process.cwd(), 'uploads', filename);
    res.sendFile(filePath);
  }
}
