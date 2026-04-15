import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CaslModule } from './casl/casl.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AplModule } from './apl/apl.module';
import { ImageModule } from './image/image.module';
import { SeedModule } from './seed/seed.module';
import { StoreModule } from './store/store.module';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig] }),
    StoreModule,
    CaslModule,
    PrismaModule,
    UsersModule,
    AplModule,
    ImageModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
