'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { getApls, getApl, createApl, deleteApl, uploadImages } from './api';
import type { CreateAplPayload } from './types';

export const APL_KEYS = {
  all: ['apls'] as const,
  detail: (id: string) => ['apls', id] as const,
};

export function useGetApls() {
  return useQuery({
    queryKey: APL_KEYS.all,
    queryFn: getApls,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const hasProcessing = data.some((a) => a.status === 'Processing');
      return hasProcessing ? 3000 : false;
    },
  });
}

export function useGetApl(id: string) {
  return useQuery({
    queryKey: APL_KEYS.detail(id),
    queryFn: () => getApl(id),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      return data.status === 'Processing' ? 2000 : false;
    },
  });
}

export function useCreateApl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAplPayload) => createApl(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: APL_KEYS.all }),
  });
}

export function useDeleteApl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteApl(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: APL_KEYS.all }),
  });
}

export function useUploadImages(aplId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => uploadImages(aplId, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APL_KEYS.detail(aplId) });
      queryClient.invalidateQueries({ queryKey: APL_KEYS.all });
    },
  });
}
