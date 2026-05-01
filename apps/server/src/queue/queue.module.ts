import { DynamicModule, Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import azureConfig from '@/config/azure.config';
import redisConfig from '@/config/redis.config';
import { BullMqQueueAdapter } from './bullmq.queue-adapter';
import { AzureServiceBusQueueAdapter } from './azure-service-bus.queue-adapter';

export interface QueueFeatureOptions {
  token: string;
  queueName: (
    azure: ConfigType<typeof azureConfig>,
    redis: ConfigType<typeof redisConfig>,
  ) => string;
}

@Module({})
export class QueueModule {
  static forFeature(options: QueueFeatureOptions): DynamicModule {
    return {
      module: QueueModule,
      providers: [
        {
          provide: options.token,
          useFactory: (
            azure: ConfigType<typeof azureConfig>,
            redis: ConfigType<typeof redisConfig>,
          ) => {
            const queueName = options.queueName(azure, redis);
            if (azure.queueProvider === 'local') {
              return new BullMqQueueAdapter(queueName, redis.host, redis.port);
            }
            return new AzureServiceBusQueueAdapter(
              azure.serviceBusConnectionString,
              queueName,
            );
          },
          inject: [azureConfig.KEY, redisConfig.KEY],
        },
      ],
      exports: [options.token],
    };
  }
}
