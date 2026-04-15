import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { ParsedFoodProfile } from './types';

const PARSE_PROMPT = `You are a food label expert. Analyze this product packet image and extract the following in JSON format:
{
  "productName": "string or null",
  "brand": "string or null",
  "ingredients": ["array", "of", "ingredients"],
  "allergens": ["declared allergens from label"],
  "probableAllergens": ["allergens that may be present based on ingredients"],
  "nutritionValues": {
    "calories": "value with unit",
    "protein": "value with unit",
    "carbohydrates": "value with unit",
    "fat": "value with unit",
    "fiber": "value with unit",
    "sugar": "value with unit",
    "sodium": "value with unit"
  }
}
Return ONLY valid JSON. If a field cannot be determined from the image, use null or empty array.`;

@Injectable()
export class ImageParserService {
  private readonly logger = new Logger(ImageParserService.name);
  private readonly openai: OpenAI;

  constructor(private readonly config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY'),
    });
  }

  async parseImages(filenames: string[]): Promise<ParsedFoodProfile> {
    const imageContents = filenames.map((filename) => {
      const filePath = join(process.cwd(), 'uploads', filename);
      const imageData = readFileSync(filePath);
      const base64 = imageData.toString('base64');
      const ext = filename.split('.').pop()?.toLowerCase();
      const mimeType =
        ext === 'png'
          ? 'image/png'
          : ext === 'webp'
            ? 'image/webp'
            : 'image/jpeg';
      return {
        type: 'image_url' as const,
        image_url: { url: `data:${mimeType};base64,${base64}` },
      };
    });

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PARSE_PROMPT },
            ...imageContents,
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    this.logger.log(`Parsed food profile: ${content}`);

    try {
      const parsed = JSON.parse(content) as ParsedFoodProfile;
      return {
        productName: parsed.productName ?? null,
        brand: parsed.brand ?? null,
        ingredients: parsed.ingredients ?? [],
        allergens: parsed.allergens ?? [],
        probableAllergens: parsed.probableAllergens ?? [],
        nutritionValues: parsed.nutritionValues ?? {},
      };
    } catch {
      this.logger.error('Failed to parse OpenAI response');
      return {
        productName: null,
        brand: null,
        ingredients: [],
        allergens: [],
        probableAllergens: [],
        nutritionValues: {},
      };
    }
  }
}
