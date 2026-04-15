import { Module } from '@nestjs/common';
import { ProcessingService } from './processing.service';
import { ImageParserService } from './image-parser.service';
import { EnrichmentService } from './enrichment.service';
import { ConfidenceService } from './confidence.service';

@Module({
  providers: [
    ProcessingService,
    ImageParserService,
    EnrichmentService,
    ConfidenceService,
  ],
  exports: [ProcessingService],
})
export class ProcessingModule {}
