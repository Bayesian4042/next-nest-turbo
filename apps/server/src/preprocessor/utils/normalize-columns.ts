const COLUMN_MAP: Record<string, string> = {
  sitecode: 'siteCode',
  mogcode: 'mogCode',
  'mog name': 'mogName',
  articlenumber: 'articleNumber',
  articledescription: 'description',
  mapstatus: 'status',
  isactive: 'isActive',
  uom: 'uom',
  merchandizecategorydesc: 'category',
  categoryname: 'categoryName',
  site: 'site',
  hierlevel3: 'hierLevel3',
  hierlevel4: 'hierLevel4',
  hierlevel5: 'hierLevel5',
  hierlevel6: 'hierLevel6',
  shelflifecategory: 'shelfLifeCat',
};

/**
 * Maps a raw CSV header name to the canonical camelCase field name used
 * in the domain model. Returns the original value (lowercased) if no
 * mapping is found so the caller can decide how to handle unknowns.
 */
export function normalizeColumnName(raw: string): string {
  const key = raw.trim().toLowerCase();
  return COLUMN_MAP[key] ?? key;
}

/**
 * Normalizes every key in a raw CSV row object using normalizeColumnName.
 */
export function normalizeRowKeys(
  row: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [normalizeColumnName(k), v]),
  );
}
