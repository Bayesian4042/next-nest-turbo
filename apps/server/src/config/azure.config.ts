import { registerAs } from '@nestjs/config';

export default registerAs('azure', () => ({
  storageProvider: process.env.STORAGE_PROVIDER ?? 'azure',
  queueProvider: process.env.QUEUE_PROVIDER ?? 'azure',
  storageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING ?? '',
  storageContainerName:
    process.env.AZURE_STORAGE_CONTAINER_NAME ?? 'matcher-csvs',
  serviceBusConnectionString:
    process.env.AZURE_SERVICE_BUS_CONNECTION_STRING ?? '',
  serviceBusQueueName:
    process.env.AZURE_SERVICE_BUS_QUEUE_NAME ?? 'matcher-jobs',
}));
