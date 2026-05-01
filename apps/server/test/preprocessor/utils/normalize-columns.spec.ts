import {
  normalizeColumnName,
  normalizeRowKeys,
} from '@/preprocessor/utils/normalize-columns';

describe('normalizeColumnName', () => {
  it('maps known MOG file headers to camelCase field names', () => {
    expect(normalizeColumnName('SiteCode')).toBe('siteCode');
    expect(normalizeColumnName('MOGCode')).toBe('mogCode');
    expect(normalizeColumnName('MOG Name')).toBe('mogName');
    expect(normalizeColumnName('MapStatus')).toBe('status');
    expect(normalizeColumnName('IsActive')).toBe('isActive');
  });

  it('maps known APL file headers to camelCase field names', () => {
    expect(normalizeColumnName('ArticleNumber')).toBe('articleNumber');
    expect(normalizeColumnName('ArticleDescription')).toBe('description');
    expect(normalizeColumnName('MerchandizeCategoryDesc')).toBe('category');
    expect(normalizeColumnName('Hierlevel3')).toBe('hierLevel3');
    expect(normalizeColumnName('ShelfLifeCategory')).toBe('shelfLifeCat');
  });

  it('returns lowercased original for unknown columns', () => {
    expect(normalizeColumnName('CustomField')).toBe('customfield');
  });

  it('trims surrounding whitespace before matching', () => {
    expect(normalizeColumnName('  SiteCode  ')).toBe('siteCode');
  });
});

describe('normalizeRowKeys', () => {
  it('normalizes all keys in a raw CSV row', () => {
    const raw = {
      SiteCode: '119A',
      MOGCode: 'MOG-00025',
      'MOG Name': 'Baby Potato Fresh',
      IsActive: '1',
    };

    expect(normalizeRowKeys(raw)).toEqual({
      siteCode: '119A',
      mogCode: 'MOG-00025',
      mogName: 'Baby Potato Fresh',
      isActive: '1',
    });
  });
});
