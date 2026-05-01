import { Logger, OnModuleDestroy } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { PreprocessorService } from '@/preprocessor/service/preprocessor.service';
import { IPreprocessorWorker } from './preprocessor-worker.interface';

export class BullMqPreprocessorWorker
  implements IPreprocessorWorker, OnModuleDestroy
{
  private readonly worker: Worker;
  private readonly logger = new Logger(BullMqPreprocessorWorker.name);

  constructor(
    queueName: string,
    redisHost: string,
    redisPort: number,
    private readonly preprocessorService: PreprocessorService,
    concurrency = parseInt(
      process.env.PREPROCESSOR_WORKER_CONCURRENCY ?? '2',
      10,
    ),
  ) {
    this.worker = new Worker(
      queueName,
      async (job: Job<{ batchId: string }>) => {
        const { batchId } = job.data;
        this.logger.log(`Picked up job ${job.id} for batch ${batchId}`);
        await this.preprocessorService.processBatch(batchId);
      },
      {
        connection: { host: redisHost, port: redisPort },
        lockDuration: 1_800_000,
        concurrency,
      },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Job ${job?.id} failed for batch ${job?.data?.batchId}: ${err.message}`,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker.close();
  }
}
