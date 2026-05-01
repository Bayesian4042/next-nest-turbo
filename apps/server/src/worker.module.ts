import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { MatcherModule } from './matcher/matcher.module';
import { PreprocessorModule } from './preprocessor/preprocessor.module';
import databaseConfig from './config/database.config';
import azureConfig from './config/azure.config';
import redisConfig from './config/redis.config';
import openaiConfig from './config/llm.config';

/**
 * Lightweight module that boots only the queue-consuming workers.
 * Deploy this process independently from the API so worker replicas
 * can be scaled horizontally without also scaling HTTP pods.
 *
 * Env vars:
 *   MATCHER_WORKER_CONCURRENCY   — BullMQ concurrent jobs per worker process (default 3)
 *   PREPROCESSOR_WORKER_CONCURRENCY — BullMQ concurrent jobs per worker process (default 2)
 *   LLM_MAX_WORKERS              — concurrent LLM calls per worker process (default 20)
 *   ARTICLE_CHUNK_SIZE           — articles fetched per DB round-trip (default 50)
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, azureConfig, redisConfig, openaiConfig],
    }),
    PrismaModule,
    PreprocessorModule,
    MatcherModule,
  ],
})
export class WorkerModule {}
