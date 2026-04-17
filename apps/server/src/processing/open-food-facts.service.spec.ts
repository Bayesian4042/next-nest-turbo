import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import { EventEmitter } from 'events';
import { OpenFoodFactsService } from './open-food-facts.service';

const mockProduct = {
  product_name: "Kellogg's Corn Flakes",
  brands: "Kellogg's, Kelloggs",
  ingredients_text: 'Corn grits, sugar, cereal extract, iodized salt',
  allergens_tags: ['en:gluten', 'en:milk'],
  traces_tags: ['en:nuts', 'en:soy'],
  nutriments: {
    'energy-kcal_100g': 378,
    proteins_100g: 6.7,
    carbohydrates_100g: 86.9,
    fat_100g: 1,
    fiber_100g: 2,
    sugars_100g: 9.2,
    sodium_100g: 0.4,
  },
};

function makeResponse(body: object, statusCode = 200) {
  const emitter = new EventEmitter() as NodeJS.ReadableStream & {
    statusCode: number;
    headers: Record<string, string>;
    resume: () => void;
  };
  (emitter as unknown as Record<string, unknown>).statusCode = statusCode;
  (emitter as unknown as Record<string, unknown>).headers = {};
  (emitter as unknown as Record<string, unknown>).resume = () => {};
  process.nextTick(() => {
    emitter.emit('data', Buffer.from(JSON.stringify(body)));
    emitter.emit('end');
  });
  return emitter;
}

describe('OpenFoodFactsService', () => {
  let service: OpenFoodFactsService;
  let httpsGetSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OpenFoodFactsService,
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();

    service = module.get(OpenFoodFactsService);

    httpsGetSpy = jest.spyOn(https, 'get').mockImplementation(
      (_url: unknown, _opts: unknown, cb: (res: unknown) => void) => {
        const req = new EventEmitter();
        (req as unknown as Record<string, unknown>).end = () => {};
        cb(makeResponse({ status: 1, product: mockProduct }));
        return req as ReturnType<typeof https.get>;
      },
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps a successful OFF response to ParsedFoodProfile', async () => {
    const result = await service.lookup('8901499008893');

    expect(result).not.toBeNull();
    expect(result!.productName).toBe("Kellogg's Corn Flakes");
    expect(result!.brand).toBe("Kellogg's");
    expect(result!.ingredients).toContain('Corn grits');
    expect(result!.allergens).toEqual(['gluten', 'milk']);
    expect(result!.probableAllergens).toEqual(['nuts', 'soy']);
    expect(result!.nutritionValues.calories).toBe('378 kcal');
    expect(result!.nutritionValues.protein).toBe('6.7 g');
    expect(result!.nutritionValues.sodium).toBe('400 mg');
  });

  it('returns null when product is not found (status: 0)', async () => {
    httpsGetSpy.mockImplementation(
      (_url: unknown, _opts: unknown, cb: (res: unknown) => void) => {
        const req = new EventEmitter();
        (req as unknown as Record<string, unknown>).end = () => {};
        cb(makeResponse({ status: 0 }));
        return req as ReturnType<typeof https.get>;
      },
    );

    const result = await service.lookup('0000000000000');
    expect(result).toBeNull();
  });

  it('returns null when the request fails with a network error', async () => {
    httpsGetSpy.mockImplementation((_url: unknown, _opts: unknown) => {
      const req = new EventEmitter();
      (req as unknown as Record<string, unknown>).end = () => {
        process.nextTick(() => req.emit('error', new Error('ECONNREFUSED')));
      };
      return req as ReturnType<typeof https.get>;
    });

    const result = await service.lookup('8901499008893');
    expect(result).toBeNull();
  });
});
