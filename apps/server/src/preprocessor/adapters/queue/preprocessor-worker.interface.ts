export const PREPROCESSOR_WORKER = 'PREPROCESSOR_WORKER';

export interface IPreprocessorWorker {
  onModuleDestroy(): Promise<void>;
}
