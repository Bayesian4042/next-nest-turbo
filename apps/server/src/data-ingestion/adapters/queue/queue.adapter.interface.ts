export const QUEUE_ADAPTER = 'QUEUE_ADAPTER';

export interface IQueueAdapter {
  sendMessage(payload: Record<string, unknown>): Promise<void>;
}
