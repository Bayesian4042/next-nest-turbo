import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CaslModule } from './casl/casl.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MatcherModule } from './matcher/matcher.module';
import { DataIngestionModule } from './data-ingestion/data-ingestion.module';
import databaseConfig from './config/database.config';
import azureConfig from './config/azure.config';
import redisConfig from './config/redis.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, azureConfig, redisConfig],
    }),
    EventEmitterModule.forRoot(),
    CaslModule,
    PrismaModule,
    UsersModule,
    NotificationsModule,
    MatcherModule,
    DataIngestionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
