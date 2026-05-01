import { Logger, OnModuleDestroy } from '@nestjs/common';
import {
  ServiceBusClient,
  ServiceBusReceiver,
  ProcessErrorArgs,
} from '@azure/service-bus';
import { PreprocessorService } from '@/preprocessor/service/preprocessor.service';
import { IPreprocessorWorker } from './preprocessor-worker.interface';

export class AzureServiceBusPreprocessorWorker
  implements IPreprocessorWorker, OnModuleDestroy
{
  private readonly client: ServiceBusClient;
  private readonly receiver: ServiceBusReceiver;
  private readonly logger = new Logger(AzureServiceBusPreprocessorWorker.name);

  constructor(
    connectionString: string,
    queueName: string,
    private readonly preprocessorService: PreprocessorService,
  ) {
    this.client = new ServiceBusClient(connectionString);
    this.receiver = this.client.createReceiver(queueName);

    this.receiver.subscribe({
      processMessage: async (message) => {
        const { batchId } = message.body as { batchId: string };
        this.logger.log(`Received message for batch ${batchId}`);
        await this.preprocessorService.processBatch(batchId);
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
