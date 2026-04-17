import { Injectable, Logger } from '@nestjs/common';
import { StoreService } from '../store/store.service';
import { ImageParserService } from './image-parser.service';
import { EnrichmentService } from './enrichment.service';
import { ConfidenceService } from './confidence.service';
import { OpenFoodFactsService } from './open-food-facts.service';
import type { ParsedFoodProfile } from './types';

function mergeParsedProfiles(
  baseline: ParsedFoodProfile,
  image: ParsedFoodProfile,
): ParsedFoodProfile {
  return {
    productName: image.productName ?? baseline.productName,
    brand: image.brand ?? baseline.brand,
    ingredients: image.ingredients.length
      ? image.ingredients
      : baseline.ingredients,
    allergens: image.allergens.length ? image.allergens : baseline.allergens,
    probableAllergens: image.probableAllergens.length
      ? image.probableAllergens
      : baseline.probableAllergens,
    nutritionValues: Object.keys(image.nutritionValues).length
      ? image.nutritionValues
      : baseline.nutritionValues,
  };
}

@Injectable()
export class ProcessingService {
  private readonly logger = new Logger(ProcessingService.name);

  constructor(
    private readonly store: StoreService,
    private readonly imageParser: ImageParserService,
    private readonly enrichment: EnrichmentService,
    private readonly confidence: ConfidenceService,
    private readonly openFoodFacts: OpenFoodFactsService,
  ) {}

  async processApl(aplId: string): Promise<void> {
    this.logger.log(`Starting processing for APL ${aplId}`);

    try {
      this.store.updateAplStatus(aplId, 'Processing');

      const apl = this.store.findApl(aplId);
      const barcode: string | null | undefined = (
        apl as unknown as Record<string, unknown>
      )?.barcode as string | null | undefined;

      const images = this.store.findImagesByApl(aplId);
      const filenames = images.map((img) => img.filename);

      const offSources: string[] = [];
      let baseline: ParsedFoodProfile | null = null;

      if (barcode) {
        baseline = await this.openFoodFacts.lookup(barcode);
        if (baseline) {
          offSources.push(`Open Food Facts (barcode ${barcode})`);
          this.logger.log(`OFF lookup succeeded for barcode ${barcode}`);
        }
      }

      if (!baseline && !filenames.length) {
        this.logger.warn(`No barcode result or images found for APL ${aplId}`);
        return;
      }

      let parsed: ParsedFoodProfile;

      if (filenames.length) {
        const imageParsed = await this.imageParser.parseImages(filenames);
        this.logger.log(`Parsed profile from images for APL ${aplId}`);
        parsed = baseline
          ? mergeParsedProfiles(baseline, imageParsed)
          : imageParsed;
      } else {
        parsed = baseline!;
      }

      const { enriched, sources: enrichSources } =
        await this.enrichment.enrich(parsed);
      this.logger.log(`Enriched data for APL ${aplId}`);

      const confidenceResult = this.confidence.score(parsed, enriched);
      this.logger.log(
        `Confidence score for APL ${aplId}: ${confidenceResult.score}`,
      );

      const allSources = [...offSources, ...enrichSources];
      const finalStatus =
        confidenceResult.level === 'low' ? 'Needs Review' : 'Enriched';

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
        sources: JSON.stringify(allSources),
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
