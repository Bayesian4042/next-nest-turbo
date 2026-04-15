import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { ParsedFoodProfile, EnrichedFoodProfile } from './types';

interface EnrichmentResult {
  enriched: EnrichedFoodProfile;
  sources: string[];
}

const ENRICHMENT_PROMPT = (parsed: ParsedFoodProfile) => `
You are a food science expert and nutritionist. Given the following product details extracted from a packet label, use your knowledge to:
1. Validate and enrich missing or unclear information
2. Fill in any missing nutrition values if you know the product
3. Confirm or expand the allergen list based on ingredients
4. Add any relevant additional product information

Parsed data from packet:
${JSON.stringify(parsed, null, 2)}

Respond in this JSON format:
{
  "productName": "string or null",
  "brand": "string or null", 
  "ingredients": ["enriched ingredients list"],
  "allergens": ["validated and expanded allergen list"],
  "probableAllergens": ["probable allergens based on ingredients"],
  "nutritionValues": {
    "calories": "...",
    "protein": "...",
    "carbohydrates": "...",
    "fat": "...",
    "fiber": "...",
    "sugar": "...",
    "sodium": "..."
  },
  "additionalInfo": "any relevant product info, manufacturer claims, certifications, etc.",
  "sources": ["source1 description", "source2 description"]
}

Return ONLY valid JSON.`;

@Injectable()
export class EnrichmentService {
  private readonly logger = new Logger(EnrichmentService.name);
  private readonly openai: OpenAI;

  constructor(private readonly config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY'),
    });
  }

  async enrich(parsed: ParsedFoodProfile): Promise<EnrichmentResult> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a food science expert. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: ENRICHMENT_PROMPT(parsed),
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    this.logger.log(`Enrichment result: ${content}`);

    try {
      const result = JSON.parse(content) as EnrichedFoodProfile & {
        sources?: string[];
      };
      const sources: string[] = Array.isArray(result.sources)
        ? result.sources
        : ['OpenAI knowledge base'];

      return {
        enriched: {
          productName: result.productName ?? parsed.productName,
          brand: result.brand ?? parsed.brand,
          ingredients:
            result.ingredients?.length ? result.ingredients : parsed.ingredients,
          allergens:
            result.allergens?.length ? result.allergens : parsed.allergens,
          probableAllergens:
            result.probableAllergens?.length
              ? result.probableAllergens
              : parsed.probableAllergens,
          nutritionValues:
            Object.keys(result.nutritionValues ?? {}).length
              ? result.nutritionValues
              : parsed.nutritionValues,
          additionalInfo: result.additionalInfo ?? null,
        },
        sources,
      };
    } catch {
      this.logger.error('Failed to parse enrichment response');
      return {
        enriched: {
          ...parsed,
          additionalInfo: null,
        },
        sources: [],
      };
    }
  }
}
