import { Injectable, Logger } from '@nestjs/common';
import { StoreService } from '../store/store.service';
import { ImageParserService } from './image-parser.service';
import { EnrichmentService } from './enrichment.service';
import { ConfidenceService } from './confidence.service';

@Injectable()
export class ProcessingService {
  private readonly logger = new Logger(ProcessingService.name);

  constructor(
    private readonly store: StoreService,
    private readonly imageParser: ImageParserService,
    private readonly enrichment: EnrichmentService,
    private readonly confidence: ConfidenceService,
  ) {}

  async processApl(aplId: string): Promise<void> {
    this.logger.log(`Starting processing for APL ${aplId}`);

    try {
      this.store.updateAplStatus(aplId, 'Processing');

      const images = this.store.findImagesByApl(aplId);
      if (!images.length) {
        this.logger.warn(`No images found for APL ${aplId}`);
        return;
      }

      const filenames = images.map((img) => img.filename);

      const parsed = await this.imageParser.parseImages(filenames);
      this.logger.log(`Parsed profile for APL ${aplId}`);

      const { enriched, sources } = await this.enrichment.enrich(parsed);
      this.logger.log(`Enriched data for APL ${aplId}`);

      const confidenceResult = this.confidence.score(parsed, enriched);
      this.logger.log(`Confidence score for APL ${aplId}: ${confidenceResult.score}`);

      const finalStatus = confidenceResult.level === 'low' ? 'Needs Review' : 'Enriched';

      this.store.upsertResult(aplId, {
        productName: parsed.productName,
        brand: parsed.brand,
        ingredients: JSON.stringify(parsed.ingredients),
        allergens: JSON.stringify(parsed.allergens),
        probableAllergens: JSON.stringify(parsed.probableAllergens),
        nutritionValues: JSON.stringify(parsed.nutritionValues),
        enrichedData: JSON.stringify(enriched),
        confidenceScore: confidenceResult.score,
        confidenceDetails: JSON.stringify(confidenceResult.fieldConfidence),
        reasoning: confidenceResult.reasoning,
        sources: JSON.stringify(sources),
        status: finalStatus,
      });

      this.store.updateAplStatus(aplId, finalStatus);
      this.logger.log(`Processing complete for APL ${aplId}: ${finalStatus}`);
    } catch (error) {
      this.logger.error(`Processing failed for APL ${aplId}`, error);
      this.store.updateAplStatus(aplId, 'Needs Review');
    }
  }
}
