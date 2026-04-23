import { Injectable } from '@nestjs/common';
import { IDataSourceParser } from './data-source-parser.interface';

@Injectable()
export class CsvDataSourceParser implements IDataSourceParser {
  supports(mimetype: string): boolean {
    return mimetype === 'text/csv';
  }

  getRowCount(buffer: Buffer): number {
    const content = buffer.toString('utf8');
    const lines = content.split('\n').filter((line) => line.trim().length > 0);
    // subtract 1 for the header row
    return Math.max(0, lines.length - 1);
  }
}
