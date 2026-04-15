import { Injectable } from '@nestjs/common';
import type {
  ParsedFoodProfile,
  EnrichedFoodProfile,
  FieldConfidence,
} from './types';

interface ConfidenceResult {
  score: number;
  level: 'high' | 'medium' | 'low';
  fieldConfidence: FieldConfidence;
  reasoning: string;
}

@Injectable()
export class ConfidenceService {
  score(
    parsed: ParsedFoodProfile,
    enriched: EnrichedFoodProfile,
  ): ConfidenceResult {
    const fieldScores: FieldConfidence = {
      productName: this.scoreField(parsed.productName, enriched.productName),
      brand: this.scoreField(parsed.brand, enriched.brand),
      ingredients: this.scoreArrayField(
        parsed.ingredients,
        enriched.ingredients,
      ),
      allergens: this.scoreArrayField(parsed.allergens, enriched.allergens),
      nutritionValues: this.scoreObjectField(
        parsed.nutritionValues,
        enriched.nutritionValues,
      ),
    };

    const scores = Object.values(fieldScores) as number[];
    const overall = Math.round(
      scores.reduce((a, b) => a + b, 0) / scores.length,
    );

    const level: 'high' | 'medium' | 'low' =
      overall >= 75 ? 'high' : overall >= 45 ? 'medium' : 'low';

    const reasoning = this.buildReasoning(level, fieldScores, parsed, enriched);

    return { score: overall, level, fieldConfidence: fieldScores, reasoning };
  }

  private scoreField(
    parsed: string | null,
    enriched: string | null,
  ): number {
    if (!parsed && !enriched) return 30;
    if (!parsed && enriched) return 55;
    if (parsed && !enriched) return 60;
    if (parsed === enriched) return 95;
    return 75;
  }

  private scoreArrayField(parsed: string[], enriched: string[]): number {
    if (!parsed.length && !enriched.length) return 30;
    if (!parsed.length && enriched.length) return 50;
    if (parsed.length && !enriched.length) return 60;
    const overlap = parsed.filter((item) =>
      enriched.some(
        (e) =>
          e.toLowerCase().includes(item.toLowerCase()) ||
          item.toLowerCase().includes(e.toLowerCase()),
      ),
    ).length;
    const ratio = overlap / Math.max(parsed.length, enriched.length);
    return Math.round(50 + ratio * 50);
  }

  private scoreObjectField(
    parsed: Record<string, string>,
    enriched: Record<string, string>,
  ): number {
    const parsedKeys = Object.keys(parsed).filter((k) => parsed[k]);
    const enrichedKeys = Object.keys(enriched).filter((k) => enriched[k]);
    if (!parsedKeys.length && !enrichedKeys.length) return 30;
    if (!parsedKeys.length && enrichedKeys.length) return 50;
    if (parsedKeys.length >= 5) return 90;
    const coverage = parsedKeys.length / 7;
    return Math.round(50 + coverage * 45);
  }

  private buildReasoning(
    level: 'high' | 'medium' | 'low',
    fields: FieldConfidence,
    parsed: ParsedFoodProfile,
    enriched: EnrichedFoodProfile,
  ): string {
    const weakFields = Object.entries(fields)
      .filter(([, score]) => score < 60)
      .map(([field]) => field);

    const nutritionCount = Object.keys(parsed.nutritionValues).filter(
      (k) => parsed.nutritionValues[k],
    ).length;

    if (level === 'high') {
      return `High confidence: Packet label provided clear data and AI enrichment confirms the details. ${parsed.productName ? `Product "${parsed.productName}" was identified with strong certainty.` : ''} All key food profile fields are consistent between extracted and enriched data.`;
    }

    if (level === 'medium') {
      const inferred = weakFields.length
        ? `Fields with lower certainty: ${weakFields.join(', ')}.`
        : '';
      return `Medium confidence: Packet provides partial data${nutritionCount < 4 ? ` (${nutritionCount}/7 nutrition fields extracted from label)` : ''}. AI enrichment filled in missing details using knowledge base. ${inferred} Some information may be inferred rather than directly read from the label.`;
    }

    return `Low confidence: ${!parsed.productName ? 'Product name could not be identified. ' : ''}${!parsed.ingredients.length ? 'Ingredients were not clearly visible on the label. ' : ''}${nutritionCount < 2 ? 'Nutrition values are largely missing from the packet. ' : ''}Evidence from the image is insufficient or conflicts with available information. Manual review is recommended.`;
  }
}
