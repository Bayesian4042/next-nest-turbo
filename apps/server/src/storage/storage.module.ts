import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import azureConfig from '@/config/azure.config';
import { STORAGE_ADAPTER } from './storage.adapter.interface';
import { LocalStorageAdapter } from './local.storage-adapter';
import { AzureBlobStorageAdapter } from './azure-blob.storage-adapter';

@Module({
  providers: [
    {
      provide: STORAGE_ADAPTER,
      useFactory: (config: ConfigType<typeof azureConfig>) => {
        if (config.storageProvider === 'local') {
          return new LocalStorageAdapter();
        }

        return new AzureBlobStorageAdapter(
          config.storageConnectionString,
          config.storageContainerName,
        );
      },
      inject: [azureConfig.KEY],
    },
  ],
  exports: [STORAGE_ADAPTER],
})
export class StorageModule {}
