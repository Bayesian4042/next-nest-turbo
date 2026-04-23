import { Injectable } from '@nestjs/common';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { IStorageAdapter } from './storage.adapter.interface';

@Injectable()
export class LocalStorageAdapter implements IStorageAdapter {
  private readonly uploadsDir = join(process.cwd(), 'uploads');

  async upload(file: Express.Multer.File, prefix: string): Promise<string> {
    const dir = join(this.uploadsDir, prefix);
    await mkdir(dir, { recursive: true });

    const filename = `${randomUUID()}-${file.originalname}`;
    const filePath = join(dir, filename);
    await writeFile(filePath, file.buffer);

    return `file://${filePath}`;
  }
}
