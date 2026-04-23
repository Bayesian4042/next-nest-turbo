export interface ImportBatchResponse {
  id: string;
  status: string;
  aplBlobUrl: string;
  mogBlobUrl: string;
  aplOriginalName: string;
  mogOriginalName: string;
  aplRowCount: number | null;
  mogRowCount: number | null;
  uploadedBy?: string;
  createdAt: Date;
}
