export const MATCHER_WORKER = 'MATCHER_WORKER';

export interface IMatcherWorker {
  onModuleDestroy(): Promise<void>;
}
