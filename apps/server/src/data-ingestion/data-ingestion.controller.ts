import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { DataIngestionService } from './data-ingestion.service';
import { UploadBatchDto } from './dto/upload-batch.dto';

@Controller('data-ingestion')
export class DataIngestionController {
  constructor(private readonly service: DataIngestionService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'aplFile', maxCount: 1 },
      { name: 'mogFile', maxCount: 1 },
    ]),
  )
  async upload(
    @UploadedFiles()
    files: {
      aplFile?: Express.Multer.File[];
      mogFile?: Express.Multer.File[];
    },
    @Body() dto: UploadBatchDto,
  ) {
    if (!files?.aplFile?.[0] || !files?.mogFile?.[0]) {
      throw new BadRequestException('Both aplFile and mogFile are required.');
    }

    return this.service.createImportBatch(
      files.aplFile[0],
      files.mogFile[0],
      dto.uploadedBy,
    );
  }
}
