import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import azureConfig from '@/config/azure.config';
import redisConfig from '@/config/redis.config';
import { DataIngestionController } from './data-ingestion.controller';
import { DataIngestionService } from './data-ingestion.service';
import { STORAGE_ADAPTER } from './adapters/storage/storage.adapter.interface';
import { QUEUE_ADAPTER } from './adapters/queue/queue.adapter.interface';
import { DATA_SOURCE_PARSERS } from './adapters/parser/data-source-parser.interface';
import { AzureBlobStorageAdapter } from './adapters/storage/azure-blob.storage-adapter';
import { LocalStorageAdapter } from './adapters/storage/local.storage-adapter';
import { AzureServiceBusQueueAdapter } from './adapters/queue/azure-service-bus.queue-adapter';
import { BullMqQueueAdapter } from './adapters/queue/bullmq.queue-adapter';
import { CsvDataSourceParser } from './adapters/parser/csv.data-source-parser';

@Module({
  controllers: [DataIngestionController],
  providers: [
    DataIngestionService,
    CsvDataSourceParser,
    {
      provide: STORAGE_ADAPTER,
      useFactory: (config: ConfigType<typeof azureConfig>) => {
        if (config.storageProvider === 'local') {
          return new LocalStorageAdapter();
        }

        return new AzureBlobStorageAdapter(
          config.storageConnectionString,
          config.storageContainerName,
        );
      },
      inject: [azureConfig.KEY],
    },
    {
      provide: QUEUE_ADAPTER,
      useFactory: (
        azure: ConfigType<typeof azureConfig>,
        redis: ConfigType<typeof redisConfig>,
      ) => {
        if (azure.queueProvider === 'local') {
          return new BullMqQueueAdapter(
            redis.queueName,
            redis.host,
            redis.port,
          );
        }

        return new AzureServiceBusQueueAdapter(
          azure.serviceBusConnectionString,
          azure.serviceBusQueueName,
        );
      },
      inject: [azureConfig.KEY, redisConfig.KEY],
    },
    {
      provide: DATA_SOURCE_PARSERS,
      useFactory: (csv: CsvDataSourceParser) => [csv],
      inject: [CsvDataSourceParser],
    },
  ],
})
export class DataIngestionModule {}
