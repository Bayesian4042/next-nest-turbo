import { Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { IQueueAdapter } from './queue.adapter.interface';

export class BullMqQueueAdapter implements IQueueAdapter, OnModuleDestroy {
  private readonly queue: Queue;
  private readonly logger = new Logger(BullMqQueueAdapter.name);

  constructor(queueName: string, redisHost: string, redisPort: number) {
    this.queue = new Queue(queueName, {
      connection: { host: redisHost, port: redisPort },
    });
  }

  async sendMessage(payload: Record<string, unknown>): Promise<void> {
    const job = await this.queue.add('process-batch', payload);
    this.logger.log(
      `Job enqueued — queue: ${this.queue.name}, jobId: ${job.id}, payload: ${JSON.stringify(payload)}`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
