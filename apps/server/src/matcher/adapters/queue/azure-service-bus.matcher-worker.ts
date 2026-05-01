import { Logger, OnModuleDestroy } from '@nestjs/common';
import {
  ServiceBusClient,
  ServiceBusReceiver,
  ProcessErrorArgs,
} from '@azure/service-bus';
import { MatcherService } from '@/matcher/matcher.service';
import { IMatcherWorker } from './matcher-worker.interface';

export class AzureServiceBusMatcherWorker
  implements IMatcherWorker, OnModuleDestroy
{
  private readonly client: ServiceBusClient;
  private readonly receiver: ServiceBusReceiver;
  private readonly logger = new Logger(AzureServiceBusMatcherWorker.name);

  constructor(
    connectionString: string,
    queueName: string,
    private readonly matcherService: MatcherService,
  ) {
    this.client = new ServiceBusClient(connectionString);
    this.receiver = this.client.createReceiver(queueName);

    this.receiver.subscribe({
      processMessage: async (message) => {
        const { batchId, siteCode } = message.body as {
          batchId: string;
          siteCode?: string;
        };
        this.logger.log(
          `Received message — batchId=${batchId}${siteCode ? ` siteCode=${siteCode}` : ''}`,
        );

        if (siteCode) {
          await this.matcherService.matchSite(batchId, siteCode);
        } else {
          await this.matcherService.matchBatch(batchId);
        }

        await this.receiver.completeMessage(message);
      },
      processError: async (args: ProcessErrorArgs) => {
        this.logger.error(
          `Service Bus error [${args.errorSource}]: ${args.error.message}`,
        );
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.receiver.close();
    await this.client.close();
  }
}
