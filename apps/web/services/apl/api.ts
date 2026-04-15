import { apiClient } from '@/lib/api-client';
import type { Apl, AplImage, CreateAplPayload } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8081';

export async function getApls(): Promise<Apl[]> {
  return apiClient<Apl[]>('/apls');
}

export async function getApl(id: string): Promise<Apl> {
  return apiClient<Apl>(`/apls/${id}`);
}

export async function createApl(payload: CreateAplPayload): Promise<Apl> {
  return apiClient<Apl>('/apls', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteApl(id: string): Promise<void> {
  await fetch(`${API_BASE}/apls/${id}`, { method: 'DELETE' });
}

export async function uploadImages(
  aplId: string,
  files: File[],
): Promise<AplImage[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));

  const res = await fetch(`${API_BASE}/apls/${aplId}/images`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json() as Promise<AplImage[]>;
}
