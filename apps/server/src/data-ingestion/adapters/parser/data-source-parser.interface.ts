export const DATA_SOURCE_PARSERS = 'DATA_SOURCE_PARSERS';

export interface IDataSourceParser {
  supports(mimetype: string): boolean;
  getRowCount(buffer: Buffer): number;
}
