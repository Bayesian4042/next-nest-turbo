export interface ParsedFoodProfile {
  productName: string | null;
  brand: string | null;
  ingredients: string[];
  allergens: string[];
  probableAllergens: string[];
  nutritionValues: Record<string, string>;
}

export interface EnrichedFoodProfile {
  productName: string | null;
  brand: string | null;
  ingredients: string[];
  allergens: string[];
  probableAllergens: string[];
  nutritionValues: Record<string, string>;
  additionalInfo: string | null;
}

export interface FieldConfidence {
  productName: number;
  brand: number;
  ingredients: number;
  allergens: number;
  nutritionValues: number;
}

export interface CreateAplPayload {
  aplCode: string;
  aplName: string;
  category: string;
}
