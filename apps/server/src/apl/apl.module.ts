import { Module } from '@nestjs/common';
import { AplController } from './apl.controller';
import { AplService } from './apl.service';
import { ProcessingModule } from '../processing/processing.module';

@Module({
  imports: [ProcessingModule],
  controllers: [AplController],
  providers: [AplService],
  exports: [AplService],
})
export class AplModule {}
