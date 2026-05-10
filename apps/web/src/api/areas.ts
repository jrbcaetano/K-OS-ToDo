import { useQuery } from '@tanstack/react-query';
import { apiGet } from './client';

export interface AreaDto {
  id: string;
  workspaceId: string;
  name: string;
  standard: string;
  contextId: string | null;
  cadence: string | null;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  archivedAt: string | null;
  createdBy: string;
  createdAt: string;
}

export function useAreas(archived = false) {
  return useQuery({
    queryKey: ['areas', { archived }],
    queryFn: () => apiGet<{ areas: AreaDto[] }>(`/areas${archived ? '?archived=true' : ''}`),
    staleTime: 30_000,
  });
}
