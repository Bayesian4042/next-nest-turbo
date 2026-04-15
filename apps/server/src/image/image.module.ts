import { Module } from '@nestjs/common';
import { ImageController } from './image.controller';
import { ImageService } from './image.service';
import { ProcessingModule } from '../processing/processing.module';

@Module({
  imports: [ProcessingModule],
  controllers: [ImageController],
  providers: [ImageService],
})
export class ImageModule {}
