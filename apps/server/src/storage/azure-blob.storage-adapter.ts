import { BlobServiceClient } from '@azure/storage-blob';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { IStorageAdapter } from './storage.adapter.interface';

export class AzureBlobStorageAdapter implements IStorageAdapter {
  private readonly blobServiceClient: BlobServiceClient;

  constructor(
    private readonly connectionString: string,
    private readonly containerName: string,
  ) {
    this.blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);
  }

  async upload(file: Express.Multer.File, prefix: string): Promise<string> {
    const blobName = `${prefix}/${randomUUID()}-${file.originalname}`;
    const containerClient = this.blobServiceClient.getContainerClient(
      this.containerName,
    );
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype },
    });

    return blockBlobClient.url;
  }

  async getReadStream(url: string): Promise<NodeJS.ReadableStream> {
    const blobName = new URL(url).pathname
      .split(`/${this.containerName}/`)
      .at(1)!;

    const containerClient = this.blobServiceClient.getContainerClient(
      this.containerName,
    );
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const downloadResponse = await blockBlobClient.download();

    return downloadResponse.readableStreamBody as Readable;
  }
}
