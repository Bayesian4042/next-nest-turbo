import { Module } from '@nestjs/common';
import { AplController } from './apl.controller';
import { AplService } from './apl.service';

@Module({
  controllers: [AplController],
  providers: [AplService],
  exports: [AplService],
})
export class AplModule {}
