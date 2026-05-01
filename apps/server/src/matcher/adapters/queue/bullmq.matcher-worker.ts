import { Logger, OnModuleDestroy } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { MatcherService } from '@/matcher/matcher.service';
import { IMatcherWorker } from './matcher-worker.interface';

export class BullMqMatcherWorker implements IMatcherWorker, OnModuleDestroy {
  private readonly worker: Worker;
  private readonly logger = new Logger(BullMqMatcherWorker.name);

  constructor(
    queueName: string,
    redisHost: string,
    redisPort: number,
    private readonly matcherService: MatcherService,
    concurrency = parseInt(process.env.MATCHER_WORKER_CONCURRENCY ?? '3', 10),
  ) {
    this.worker = new Worker(
      queueName,
      async (job: Job<{ batchId: string; siteCode?: string }>) => {
        const { batchId, siteCode } = job.data;
        this.logger.log(
          `Picked up job ${job.id} — batchId=${batchId}${siteCode ? ` siteCode=${siteCode}` : ''}`,
        );

        if (siteCode) {
          await this.matcherService.matchSite(batchId, siteCode);
        } else {
          // Legacy: full-batch job (backward compat, e.g. manual triggers)
          await this.matcherService.matchBatch(batchId);
        }
      },
      {
        connection: { host: redisHost, port: redisPort },
        lockDuration: 1_800_000,
        concurrency,
      },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Job ${job?.id} failed — batchId=${job?.data?.batchId} siteCode=${job?.data?.siteCode ?? 'N/A'}: ${err.message}`,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker.close();
  }
}
