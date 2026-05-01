import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import azureConfig from '@/config/azure.config';
import redisConfig from '@/config/redis.config';
import { StorageModule } from '@/storage/storage.module';
import { QueueModule } from '@/queue/queue.module';
import { MATCHER_QUEUE_ADAPTER } from '@/queue/queue.adapter.interface';
import { PreprocessorService } from './service/preprocessor.service';
import { PREPROCESSOR_WORKER } from './adapters/queue/preprocessor-worker.interface';
import { BullMqPreprocessorWorker } from './adapters/queue/bullmq.preprocessor-worker';
import { AzureServiceBusPreprocessorWorker } from './adapters/queue/azure-service-bus.preprocessor-worker';

@Module({
  imports: [
    StorageModule,
    QueueModule.forFeature({
      token: MATCHER_QUEUE_ADAPTER,
      queueName: (
        azure: ConfigType<typeof azureConfig>,
        redis: ConfigType<typeof redisConfig>,
      ) =>
        azure.queueProvider === 'local'
          ? redis.matcherQueueName
          : azure.matcherServiceBusQueueName,
    }),
  ],
  providers: [
    PreprocessorService,
    {
      provide: PREPROCESSOR_WORKER,
      useFactory: (
        azure: ConfigType<typeof azureConfig>,
        redis: ConfigType<typeof redisConfig>,
        preprocessorService: PreprocessorService,
      ) => {
        if (azure.queueProvider === 'local') {
          return new BullMqPreprocessorWorker(
            redis.queueName,
            redis.host,
            redis.port,
            preprocessorService,
          );
        }

        return new AzureServiceBusPreprocessorWorker(
          azure.serviceBusConnectionString,
          azure.serviceBusQueueName,
          preprocessorService,
        );
      },
      inject: [azureConfig.KEY, redisConfig.KEY, PreprocessorService],
    },
  ],
})
export class PreprocessorModule {}
