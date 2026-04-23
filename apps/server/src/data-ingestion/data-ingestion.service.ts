import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  STORAGE_ADAPTER,
  IStorageAdapter,
} from './adapters/storage/storage.adapter.interface';
import {
  QUEUE_ADAPTER,
  IQueueAdapter,
} from './adapters/queue/queue.adapter.interface';
import {
  DATA_SOURCE_PARSERS,
  IDataSourceParser,
} from './adapters/parser/data-source-parser.interface';
import type { ImportBatchResponse } from '@repo/types';

@Injectable()
export class DataIngestionService {
  constructor(
    @Inject(STORAGE_ADAPTER)
    private readonly storage: IStorageAdapter,
    @Inject(QUEUE_ADAPTER)
    private readonly queue: IQueueAdapter,
    @Inject(DATA_SOURCE_PARSERS)
    private readonly parsers: IDataSourceParser[],
    private readonly prisma: PrismaService,
  ) {}

  async createImportBatch(
    aplFile: Express.Multer.File,
    mogFile: Express.Multer.File,
    uploadedBy?: string,
  ): Promise<ImportBatchResponse> {
    const parser = this.resolveParser(aplFile.mimetype);
    this.resolveParser(mogFile.mimetype);

    const aplRowCount = parser.getRowCount(aplFile.buffer);
    const mogRowCount = parser.getRowCount(mogFile.buffer);

    const [aplBlobUrl, mogBlobUrl] = await Promise.all([
      this.storage.upload(aplFile, 'apl'),
      this.storage.upload(mogFile, 'mog'),
    ]);

    const batch = await this.prisma.importBatch.create({
      data: {
        status: 'UPLOADED',
        aplBlobUrl,
        mogBlobUrl,
        aplOriginalName: aplFile.originalname,
        mogOriginalName: mogFile.originalname,
        aplRowCount,
        mogRowCount,
        uploadedBy: uploadedBy ?? null,
      },
    });

    await this.queue.sendMessage({ batchId: batch.id });

    return {
      id: batch.id,
      status: batch.status,
      aplBlobUrl: batch.aplBlobUrl,
      mogBlobUrl: batch.mogBlobUrl,
      aplOriginalName: batch.aplOriginalName,
      mogOriginalName: batch.mogOriginalName,
      aplRowCount: batch.aplRowCount,
      mogRowCount: batch.mogRowCount,
      uploadedBy: batch.uploadedBy ?? undefined,
      createdAt: batch.createdAt,
    };
  }

  private resolveParser(mimetype: string): IDataSourceParser {
    const parser = this.parsers.find((p) => p.supports(mimetype));

    if (!parser) {
      throw new BadRequestException(
        `Unsupported file type: ${mimetype}. Supported types: text/csv`,
      );
    }

    return parser;
  }
}
