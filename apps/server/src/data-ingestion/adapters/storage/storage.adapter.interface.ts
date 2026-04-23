export const STORAGE_ADAPTER = 'STORAGE_ADAPTER';

export interface IStorageAdapter {
  upload(file: Express.Multer.File, prefix: string): Promise<string>;
}
