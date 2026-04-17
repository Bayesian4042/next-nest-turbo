import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import type { ParsedFoodProfile } from './types';

interface OFFNutriments {
  'energy-kcal_100g'?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
  fiber_100g?: number;
  sugars_100g?: number;
  sodium_100g?: number;
}

interface OFFProduct {
  product_name?: string;
  brands?: string;
  ingredients_text?: string;
  allergens_tags?: string[];
  traces_tags?: string[];
  nutriments?: OFFNutriments;
}

interface OFFResponse {
  status: number;
  product?: OFFProduct;
}

const EMPTY_PROFILE: ParsedFoodProfile = {
  productName: null,
  brand: null,
  ingredients: [],
  allergens: [],
  probableAllergens: [],
  nutritionValues: {},
};

@Injectable()
export class OpenFoodFactsService {
  private readonly logger = new Logger(OpenFoodFactsService.name);
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = (
      this.config.get<string>('OPEN_FOOD_FACTS_BASE_URL') ??
      'https://api.openfoodfacts.org'
    ).replace(/\/$/, '');
  }

  async lookup(barcode: string): Promise<ParsedFoodProfile | null> {
    const fields = 'product_name,brands,ingredients_text,allergens_tags,traces_tags,nutriments';
    const url = `${this.baseUrl}/api/v2/product/${barcode}?fields=${fields}`;
    this.logger.log(`OFF request: GET ${url}`);
    try {
      const text = await this.httpGet(url);
      const data = JSON.parse(text) as OFFResponse;

      if (data.status !== 1 || !data.product) {
        this.logger.debug(`Product not found in OFF for barcode ${barcode}`);
        return null;
      }

      this.logger.log(`OFF lookup succeeded for barcode ${barcode}`);
      return this.mapProduct(data.product);
    } catch (err) {
      this.logger.error(`OFF lookup failed for barcode ${barcode}`, err);
      return null;
    }
  }

  private httpGet(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = https.get(
        url,
        {
          headers: {
            'User-Agent': 'RETINA-ai/1.0 (contact@retina.ai)',
            'Accept': 'application/json',
          },
        },
        (res) => {
          // Follow redirects (301/302)
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            this.logger.debug(`OFF redirect ${res.statusCode} → ${res.headers.location}`);
            resolve(this.httpGet(res.headers.location));
            res.resume();
            return;
          }

          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode} from OFF for URL: ${url}`));
            res.resume();
            return;
          }

          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
          res.on('error', reject);
        },
      );
      req.on('error', reject);
      req.end();
    });
  }

  private mapProduct(product: OFFProduct): ParsedFoodProfile {
    const productName = product.product_name?.trim() || null;

    const brand = product.brands
      ? (product.brands.split(',')[0]?.trim() ?? null)
      : null;

    const ingredients = product.ingredients_text
      ? product.ingredients_text
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const allergens = (product.allergens_tags ?? [])
      .map((tag) => tag.replace(/^en:/, '').trim())
      .filter(Boolean);

    const probableAllergens = (product.traces_tags ?? [])
      .map((tag) => tag.replace(/^en:/, '').trim())
      .filter(Boolean);

    const nutritionValues = this.mapNutriments(product.nutriments ?? {});

    return {
      productName,
      brand,
      ingredients,
      allergens,
      probableAllergens,
      nutritionValues,
    };
  }

  private mapNutriments(n: OFFNutriments): Record<string, string> {
    const values: Record<string, string> = {};

    if (n['energy-kcal_100g'] != null)
      values.calories = `${n['energy-kcal_100g']} kcal`;
    if (n.proteins_100g != null) values.protein = `${n.proteins_100g} g`;
    if (n.carbohydrates_100g != null)
      values.carbohydrates = `${n.carbohydrates_100g} g`;
    if (n.fat_100g != null) values.fat = `${n.fat_100g} g`;
    if (n.fiber_100g != null) values.fiber = `${n.fiber_100g} g`;
    if (n.sugars_100g != null) values.sugar = `${n.sugars_100g} g`;
    if (n.sodium_100g != null)
      values.sodium = `${Math.round(n.sodium_100g * 1000)} mg`;

    return values;
  }

  emptyProfile(): ParsedFoodProfile {
    return { ...EMPTY_PROFILE, nutritionValues: {} };
  }
}
