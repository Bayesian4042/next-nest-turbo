import { Test } from '@nestjs/testing';
import { ProcessingService } from './processing.service';
import { StoreService } from '../store/store.service';
import { ImageParserService } from './image-parser.service';
import { EnrichmentService } from './enrichment.service';
import { ConfidenceService } from './confidence.service';
import { OpenFoodFactsService } from './open-food-facts.service';
import type { ParsedFoodProfile } from './types';

const makeApl = (overrides: Record<string, unknown> = {}) => ({
  id: 'apl-1',
  aplCode: 'APL-001',
  aplName: 'Corn Flakes',
  category: 'Cereals',
  status: 'Processing',
  barcode: null,
  images: [],
  result: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const makeImage = (filename: string) => ({
  id: 'img-1',
  aplId: 'apl-1',
  filename,
  originalName: filename,
  mimeType: 'image/jpeg',
  createdAt: new Date().toISOString(),
});

const offProfile: ParsedFoodProfile = {
  productName: 'Corn Flakes OFF',
  brand: "Kellogg's",
  ingredients: ['Corn', 'Sugar'],
  allergens: ['gluten'],
  probableAllergens: ['nuts'],
  nutritionValues: { calories: '357 kcal' },
};

const imageProfile: ParsedFoodProfile = {
  productName: 'Corn Flakes Image',
  brand: null,
  ingredients: ['Corn', 'Sugar', 'Salt'],
  allergens: ['gluten', 'milk'],
  probableAllergens: [],
  nutritionValues: { calories: '360 kcal', protein: '7 g' },
};

const enrichedResult = {
  enriched: {
    productName: 'Corn Flakes',
    brand: "Kellogg's",
    ingredients: ['Corn', 'Sugar', 'Salt'],
    allergens: ['gluten', 'milk'],
    probableAllergens: ['nuts'],
    nutritionValues: { calories: '360 kcal', protein: '7 g' },
    additionalInfo: null,
  },
  sources: ['OpenAI knowledge base'],
};

const confidenceResult = {
  score: 85,
  level: 'high' as const,
  fieldConfidence: {
    productName: 95,
    brand: 80,
    ingredients: 90,
    allergens: 85,
    nutritionValues: 75,
  },
  reasoning: 'High confidence',
};

describe('ProcessingService', () => {
  let service: ProcessingService;
  let store: jest.Mocked<StoreService>;
  let imageParser: jest.Mocked<ImageParserService>;
  let enrichment: jest.Mocked<EnrichmentService>;
  let confidence: jest.Mocked<ConfidenceService>;
  let off: jest.Mocked<OpenFoodFactsService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProcessingService,
        {
          provide: StoreService,
          useValue: {
            findApl: jest.fn(),
            findImagesByApl: jest.fn(),
            updateAplStatus: jest.fn(),
            upsertResult: jest.fn(),
          },
        },
        {
          provide: ImageParserService,
          useValue: { parseImages: jest.fn() },
        },
        {
          provide: EnrichmentService,
          useValue: { enrich: jest.fn() },
        },
        {
          provide: ConfidenceService,
          useValue: { score: jest.fn() },
        },
        {
          provide: OpenFoodFactsService,
          useValue: {
            lookup: jest.fn(),
            emptyProfile: jest.fn().mockReturnValue({
              productName: null,
              brand: null,
              ingredients: [],
              allergens: [],
              probableAllergens: [],
              nutritionValues: {},
            }),
          },
        },
      ],
    }).compile();

    service = module.get(ProcessingService);
    store = module.get(StoreService) as jest.Mocked<StoreService>;
    imageParser = module.get(ImageParserService) as jest.Mocked<ImageParserService>;
    enrichment = module.get(EnrichmentService) as jest.Mocked<EnrichmentService>;
    confidence = module.get(ConfidenceService) as jest.Mocked<ConfidenceService>;
    off = module.get(OpenFoodFactsService) as jest.Mocked<OpenFoodFactsService>;
  });

  it('barcode-only (no images): uses OFF profile and stores result with OFF source', async () => {
    store.findApl.mockReturnValue(makeApl({ barcode: '5000112637939' }) as never);
    store.findImagesByApl.mockReturnValue([]);
    off.lookup.mockResolvedValue(offProfile);
    enrichment.enrich.mockResolvedValue(enrichedResult);
    confidence.score.mockReturnValue(confidenceResult);

    await service.processApl('apl-1');

    expect(off.lookup).toHaveBeenCalledWith('5000112637939');
    expect(imageParser.parseImages).not.toHaveBeenCalled();
    expect(enrichment.enrich).toHaveBeenCalledWith(offProfile);
    expect(store.upsertResult).toHaveBeenCalledWith(
      'apl-1',
      expect.objectContaining({
        sources: expect.stringContaining('Open Food Facts'),
      }),
    );
  });

  it('barcode + images: merges profiles with image values winning, calls enrichment once', async () => {
    store.findApl.mockReturnValue(makeApl({ barcode: '5000112637939' }) as never);
    store.findImagesByApl.mockReturnValue([makeImage('label.jpg')] as never);
    off.lookup.mockResolvedValue(offProfile);
    imageParser.parseImages.mockResolvedValue(imageProfile);
    enrichment.enrich.mockResolvedValue(enrichedResult);
    confidence.score.mockReturnValue(confidenceResult);

    await service.processApl('apl-1');

    expect(off.lookup).toHaveBeenCalledWith('5000112637939');
    expect(imageParser.parseImages).toHaveBeenCalledWith(['label.jpg']);

    const mergedArg = enrichment.enrich.mock.calls[0][0];
    expect(mergedArg.productName).toBe('Corn Flakes Image');
    expect(mergedArg.allergens).toEqual(['gluten', 'milk']);
    expect(mergedArg.brand).toBe("Kellogg's");
    expect(enrichment.enrich).toHaveBeenCalledTimes(1);
  });

  it('OFF returns null + images present: falls back to image-only profile', async () => {
    store.findApl.mockReturnValue(makeApl({ barcode: '0000000000000' }) as never);
    store.findImagesByApl.mockReturnValue([makeImage('label.jpg')] as never);
    off.lookup.mockResolvedValue(null);
    imageParser.parseImages.mockResolvedValue(imageProfile);
    enrichment.enrich.mockResolvedValue(enrichedResult);
    confidence.score.mockReturnValue(confidenceResult);

    await service.processApl('apl-1');

    const mergedArg = enrichment.enrich.mock.calls[0][0];
    expect(mergedArg).toEqual(imageProfile);
    expect(store.upsertResult).toHaveBeenCalledWith(
      'apl-1',
      expect.not.objectContaining({
        sources: expect.stringContaining('Open Food Facts'),
      }),
    );
  });
});
