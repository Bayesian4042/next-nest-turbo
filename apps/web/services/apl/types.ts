export type AplStatus = 'Processing' | 'Enriched' | 'Needs Review';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface AplImage {
  id: string;
  aplId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  createdAt: string;
}

export interface FieldConfidence {
  productName: number;
  brand: number;
  ingredients: number;
  allergens: number;
  nutritionValues: number;
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

export interface AplResult {
  id: string;
  aplId: string;
  productName: string | null;
  brand: string | null;
  ingredients: string[];
  allergens: string[];
  probableAllergens: string[];
  nutritionValues: Record<string, string>;
  enrichedData: EnrichedFoodProfile | null;
  confidenceScore: number | null;
  confidenceDetails: FieldConfidence | null;
  reasoning: string | null;
  sources: string[];
  status: AplStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Apl {
  id: string;
  aplCode: string;
  aplName: string;
  category: string;
  barcode?: string | null;
  status: AplStatus;
  images: AplImage[];
  result: AplResult | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAplPayload {
  aplCode: string;
  aplName: string;
  category: string;
  barcode?: string;
}
