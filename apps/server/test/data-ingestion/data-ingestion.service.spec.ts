import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataIngestionService } from '@/data-ingestion/data-ingestion.service';
import {
  STORAGE_ADAPTER,
  IStorageAdapter,
} from '@/data-ingestion/adapters/storage/storage.adapter.interface';
import {
  QUEUE_ADAPTER,
  IQueueAdapter,
} from '@/data-ingestion/adapters/queue/queue.adapter.interface';
import {
  DATA_SOURCE_PARSERS,
  IDataSourceParser,
} from '@/data-ingestion/adapters/parser/data-source-parser.interface';
import { PrismaService } from '@/prisma/prisma.service';

const makeCsvFile = (
  originalname = 'data.csv',
  mimetype = 'text/csv',
): Express.Multer.File =>
  ({
    originalname,
    mimetype,
    buffer: Buffer.from('col1,col2\nval1,val2\nval3,val4'),
    size: 100,
    fieldname: 'file',
    encoding: '7bit',
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
  }) as Express.Multer.File;

const mockBatch = {
  id: 'batch-uuid',
  status: 'UPLOADED',
  aplBlobUrl: 'https://blob/apl.csv',
  mogBlobUrl: 'https://blob/mog.csv',
  aplOriginalName: 'apl.csv',
  mogOriginalName: 'mog.csv',
  aplRowCount: 2,
  mogRowCount: 2,
  uploadedBy: null,
  errorMessage: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('DataIngestionService', () => {
  let service: DataIngestionService;
  let storageAdapter: jest.Mocked<IStorageAdapter>;
  let queueAdapter: jest.Mocked<IQueueAdapter>;
  let csvParser: jest.Mocked<IDataSourceParser>;
  let prisma: { importBatch: { create: jest.Mock } };

  beforeEach(async () => {
    storageAdapter = { upload: jest.fn() };
    queueAdapter = { sendMessage: jest.fn() };
    csvParser = { supports: jest.fn(), getRowCount: jest.fn() };
    prisma = { importBatch: { create: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataIngestionService,
        { provide: STORAGE_ADAPTER, useValue: storageAdapter },
        { provide: QUEUE_ADAPTER, useValue: queueAdapter },
        { provide: DATA_SOURCE_PARSERS, useValue: [csvParser] },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(DataIngestionService);
  });

  describe('createImportBatch', () => {
    it('uploads both files, persists batch with UPLOADED status, and enqueues message', async () => {
      const aplFile = makeCsvFile('apl.csv');
      const mogFile = makeCsvFile('mog.csv');

      csvParser.supports.mockReturnValue(true);
      csvParser.getRowCount.mockReturnValue(2);
      storageAdapter.upload
        .mockResolvedValueOnce('https://blob/apl.csv')
        .mockResolvedValueOnce('https://blob/mog.csv');
      prisma.importBatch.create.mockResolvedValue(mockBatch);
      queueAdapter.sendMessage.mockResolvedValue(undefined);

      const result = await service.createImportBatch(aplFile, mogFile);

      expect(storageAdapter.upload).toHaveBeenCalledWith(aplFile, 'apl');
      expect(storageAdapter.upload).toHaveBeenCalledWith(mogFile, 'mog');
      expect(prisma.importBatch.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'UPLOADED',
            aplBlobUrl: 'https://blob/apl.csv',
            mogBlobUrl: 'https://blob/mog.csv',
          }),
        }),
      );
      expect(queueAdapter.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ batchId: 'batch-uuid' }),
      );
      expect(result.id).toBe('batch-uuid');
      expect(result.status).toBe('UPLOADED');
    });

    it('throws BadRequestException when file type is not supported', async () => {
      const aplFile = makeCsvFile(
        'apl.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );

      const mogFile = makeCsvFile('mog.csv');

      csvParser.supports.mockReturnValue(false);

      await expect(service.createImportBatch(aplFile, mogFile)).rejects.toThrow(
        BadRequestException,
      );
      expect(storageAdapter.upload).not.toHaveBeenCalled();
      expect(prisma.importBatch.create).not.toHaveBeenCalled();
    });

    it('does not create a DB record when storage upload fails', async () => {
      const aplFile = makeCsvFile('apl.csv');
      const mogFile = makeCsvFile('mog.csv');

      csvParser.supports.mockReturnValue(true);
      csvParser.getRowCount.mockReturnValue(2);
      storageAdapter.upload.mockRejectedValue(new Error('Blob unreachable'));

      await expect(service.createImportBatch(aplFile, mogFile)).rejects.toThrow(
        'Blob unreachable',
      );
      expect(prisma.importBatch.create).not.toHaveBeenCalled();
    });

    it('propagates queue error after batch is created', async () => {
      const aplFile = makeCsvFile('apl.csv');
      const mogFile = makeCsvFile('mog.csv');

      csvParser.supports.mockReturnValue(true);
      csvParser.getRowCount.mockReturnValue(2);
      storageAdapter.upload
        .mockResolvedValueOnce('https://blob/apl.csv')
        .mockResolvedValueOnce('https://blob/mog.csv');
      prisma.importBatch.create.mockResolvedValue(mockBatch);
      queueAdapter.sendMessage.mockRejectedValue(new Error('Bus unavailable'));

      await expect(service.createImportBatch(aplFile, mogFile)).rejects.toThrow(
        'Bus unavailable',
      );
      expect(prisma.importBatch.create).toHaveBeenCalled();
    });
  });
});
