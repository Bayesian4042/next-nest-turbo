import { Injectable, Logger } from '@nestjs/common';
import { StoreService } from '../store/store.service';

const DEMOS = [
  {
    aplCode: 'APL-2024-001',
    aplName: "Kellogg's Corn Flakes 500g",
    category: 'Cereals & Breakfast',
    status: 'Enriched',
    result: {
      productName: "Kellogg's Corn Flakes",
      brand: "Kellogg's",
      ingredients: JSON.stringify(['Milled Corn', 'Sugar', 'Salt', 'Barley Malt Flavouring', 'Niacinamide', 'Reduced Iron', 'Vitamin B6', 'Riboflavin', 'Thiamin Mononitrate', 'Folic Acid', 'Vitamin D', 'Vitamin B12']),
      allergens: JSON.stringify(['Gluten', 'Wheat', 'Barley']),
      probableAllergens: JSON.stringify(['May contain traces of milk, soy, nuts']),
      nutritionValues: JSON.stringify({ calories: '357 kcal / 100g', protein: '7.5g / 100g', carbohydrates: '79g / 100g', fat: '0.9g / 100g', fiber: '3g / 100g', sugar: '8g / 100g', sodium: '660mg / 100g' }),
      enrichedData: JSON.stringify({ productName: "Kellogg's Corn Flakes", brand: "Kellogg's", ingredients: ['Milled Corn', 'Sugar', 'Salt', 'Barley Malt Flavouring', 'Niacinamide', 'Reduced Iron', 'Vitamin B6', 'Riboflavin', 'Thiamin Mononitrate', 'Folic Acid', 'Vitamin D', 'Vitamin B12'], allergens: ['Gluten', 'Wheat', 'Barley'], probableAllergens: ['Milk', 'Soy', 'Tree Nuts'], nutritionValues: { calories: '357 kcal / 100g', protein: '7.5g / 100g', carbohydrates: '79g / 100g', fat: '0.9g / 100g', fiber: '3g / 100g', sugar: '8g / 100g', sodium: '660mg / 100g' }, additionalInfo: "Kellogg's Corn Flakes are a classic ready-to-eat cereal, fortified with essential vitamins and minerals. Suitable for vegetarians. Carries a Nutri-Score A rating in several European markets." }),
      confidenceScore: 92,
      confidenceDetails: JSON.stringify({ productName: 95, brand: 98, ingredients: 90, allergens: 92, nutritionValues: 88 }),
      reasoning: "High confidence: Packet label provided clear data and AI enrichment confirms the details. Product \"Kellogg's Corn Flakes\" was identified with strong certainty. All key food profile fields are consistent between extracted and enriched data.",
      sources: JSON.stringify(["Kellogg's official product page and nutrition database", 'Open Food Facts verified product entry', 'EU Food Information Regulation allergen database']),
      status: 'Enriched',
    },
  },
  {
    aplCode: 'APL-2024-002',
    aplName: 'Garden Fresh Mixed Vegetable Soup 400g',
    category: 'Canned & Packaged Goods',
    status: 'Enriched',
    result: {
      productName: 'Garden Fresh Mixed Vegetable Soup',
      brand: 'Garden Fresh',
      ingredients: JSON.stringify(['Water', 'Carrots', 'Peas', 'Potatoes', 'Onions', 'Modified Starch', 'Salt', 'Yeast Extract', 'Spices']),
      allergens: JSON.stringify(['Celery']),
      probableAllergens: JSON.stringify(['Gluten', 'Soy']),
      nutritionValues: JSON.stringify({ calories: '45 kcal / 100g', protein: '1.8g / 100g', carbohydrates: '7.2g / 100g', fat: '0.8g / 100g', fiber: '', sugar: '', sodium: '' }),
      enrichedData: JSON.stringify({ productName: 'Garden Fresh Mixed Vegetable Soup', brand: 'Garden Fresh', ingredients: ['Water', 'Carrots (15%)', 'Peas (10%)', 'Potatoes (10%)', 'Onions', 'Modified Corn Starch', 'Salt', 'Yeast Extract', 'Celery', 'Mixed Spices'], allergens: ['Celery'], probableAllergens: ['Gluten', 'Soy', 'Milk'], nutritionValues: { calories: '45 kcal / 100g', protein: '1.8g / 100g', carbohydrates: '7.2g / 100g', fat: '0.8g / 100g', fiber: '1.5g / 100g', sugar: '2.1g / 100g', sodium: '380mg / 100g' }, additionalInfo: 'Vegetable soup with no artificial preservatives or colours. AI enrichment filled in missing nutrition fields (fiber, sugar, sodium) based on standard composition data for similar products. Celery allergen confirmed from ingredient list.' }),
      confidenceScore: 62,
      confidenceDetails: JSON.stringify({ productName: 72, brand: 65, ingredients: 68, allergens: 70, nutritionValues: 55 }),
      reasoning: 'Medium confidence: Packet provides partial data (3/7 nutrition fields extracted from label). AI enrichment filled in missing details using knowledge base. Fields with lower certainty: nutritionValues. Some information may be inferred rather than directly read from the label.',
      sources: JSON.stringify(['USDA FoodData Central — vegetable soup composition averages', 'EU allergen database — celery cross-reactivity data', 'AI knowledge base inference for fiber and sodium values']),
      status: 'Enriched',
    },
  },
  {
    aplCode: 'APL-2024-003',
    aplName: 'Unknown Wheat Snack',
    category: 'Snacks & Confectionery',
    status: 'Needs Review',
    result: {
      productName: null,
      brand: null,
      ingredients: JSON.stringify(['Wheat Flour', 'Vegetable Oil', 'Salt']),
      allergens: JSON.stringify(['Gluten']),
      probableAllergens: JSON.stringify([]),
      nutritionValues: JSON.stringify({}),
      enrichedData: JSON.stringify({ productName: null, brand: null, ingredients: ['Wheat Flour', 'Vegetable Oil', 'Salt'], allergens: ['Gluten', 'Wheat'], probableAllergens: ['Soy', 'Sesame'], nutritionValues: {}, additionalInfo: 'Insufficient data: image quality prevented full label extraction. Only partial ingredients visible. Unable to identify brand or complete product name.' }),
      confidenceScore: 28,
      confidenceDetails: JSON.stringify({ productName: 20, brand: 20, ingredients: 40, allergens: 35, nutritionValues: 20 }),
      reasoning: 'Low confidence: Product name could not be identified. Nutrition values are largely missing from the packet. Evidence from the image is insufficient or conflicts with available information. Manual review is recommended.',
      sources: JSON.stringify(['Partial packet label (low image quality)', 'Generic wheat-based snack product composition estimates']),
      status: 'Needs Review',
    },
  },
];

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly store: StoreService) {}

  seedDemoData() {
    this.store.clearAll();

    for (const demo of DEMOS) {
      const apl = this.store.createApl({
        aplCode: demo.aplCode,
        aplName: demo.aplName,
        category: demo.category,
        status: demo.status,
      });
      this.store.upsertResult(apl.id, demo.result);
      this.logger.log(`Seeded: ${demo.aplCode}`);
    }

    return { seeded: DEMOS.length };
  }
}
