import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend } from './client';
import type { TaskDto } from './tasks';
import type { ArchiveReason, ProjectPersonDto } from './projects';

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
  archiveReason: ArchiveReason | null;
  archiveNote: string | null;
  archivedBy: string | null;
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

export function useArea(id: string | undefined) {
  return useQuery({
    queryKey: ['area', id],
    enabled: !!id,
    queryFn: () => apiGet<{ area: AreaDto }>(`/areas/${id}`),
    staleTime: 30_000,
  });
}

export function useAreaPeople(id: string | undefined) {
  return useQuery({
    queryKey: ['area', id, 'people'],
    enabled: !!id,
    queryFn: () => apiGet<{ people: ProjectPersonDto[] }>(`/areas/${id}/people`),
    staleTime: 30_000,
  });
}

export function useAreaTasks(id: string | undefined) {
  return useQuery({
    queryKey: ['area', id, 'tasks'],
    enabled: !!id,
    queryFn: () => apiGet<{ tasks: TaskDto[] }>(`/tasks?area_id=${encodeURIComponent(id ?? '')}`),
    staleTime: 30_000,
  });
}

export function useArchiveArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; reason: ArchiveReason; note?: string | null }) =>
      apiSend<{ area: AreaDto }>('POST', `/areas/${vars.id}/archive`, {
        reason: vars.reason,
        note: vars.note ?? null,
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['areas'] });
      qc.invalidateQueries({ queryKey: ['area', vars.id] });
    },
  });
}

export function useRestoreArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiSend<{ area: AreaDto }>('POST', `/areas/${id}/restore`),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['areas'] });
      qc.invalidateQueries({ queryKey: ['area', id] });
    },
  });
}

export function useReviewArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; nextReviewAt?: string | null }) =>
      apiSend<{ area: AreaDto }>('POST', `/areas/${vars.id}/review`, {
        nextReviewAt: vars.nextReviewAt ?? undefined,
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['areas'] });
      qc.invalidateQueries({ queryKey: ['area', vars.id] });
    },
  });
}
