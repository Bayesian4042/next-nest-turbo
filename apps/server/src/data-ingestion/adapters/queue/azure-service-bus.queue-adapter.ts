import { OnModuleDestroy } from '@nestjs/common';
import { ServiceBusClient, ServiceBusSender } from '@azure/service-bus';
import { IQueueAdapter } from './queue.adapter.interface';

export class AzureServiceBusQueueAdapter
  implements IQueueAdapter, OnModuleDestroy
{
  private readonly client: ServiceBusClient;
  private readonly sender: ServiceBusSender;

  constructor(
    connectionString: string,
    private readonly queueName: string,
  ) {
    this.client = new ServiceBusClient(connectionString);
    this.sender = this.client.createSender(queueName);
  }

  async sendMessage(payload: Record<string, unknown>): Promise<void> {
    await this.sender.sendMessages({ body: payload });
  }

  async onModuleDestroy(): Promise<void> {
    await this.sender.close();
    await this.client.close();
  }
}
