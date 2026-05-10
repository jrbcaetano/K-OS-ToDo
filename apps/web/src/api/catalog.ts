/**
 * Lightweight read hooks for catalog (contexts, tags) + project / area /
 * person *names*. Used by the picker menus on Task detail.
 */

import { useQuery } from '@tanstack/react-query';
import { apiGet } from './client';

export interface ContextDto {
  id: string;
  workspaceId: string;
  slug: string;
  label: string;
  color: string;
  sortOrder: number;
  createdAt: string;
}

export interface TagDto {
  id: string;
  workspaceId: string;
  name: string;
  createdAt: string;
}

export function useContexts() {
  return useQuery({
    queryKey: ['contexts'],
    queryFn: () => apiGet<{ contexts: ContextDto[] }>('/contexts'),
    staleTime: 60_000,
  });
}

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => apiGet<{ tags: TagDto[] }>('/tags'),
    staleTime: 60_000,
  });
}
