/**
 * Inbox + capture hooks.
 *
 * GET /inbox returns the active inbox items; POST /inbox/capture creates one.
 * Both invalidate the same query keys so the inbox list refreshes after a
 * capture or triage without a manual refetch.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend } from './client';
import type { TaskDto } from './tasks';

export function useInbox() {
  return useQuery({
    queryKey: ['inbox'],
    queryFn: () => apiGet<{ tasks: TaskDto[] }>('/inbox'),
    staleTime: 10_000,
  });
}

export interface CaptureInput {
  title: string;
  description?: string | null;
  sourceKind?: string | null;
  sourceRef?: string | null;
}

export function useCapture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CaptureInput) =>
      apiSend<{ task: TaskDto }>('POST', '/inbox/capture', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export interface TriageInput {
  status: 'next' | 'scheduled' | 'waiting' | 'delegated' | 'blocked' | 'someday' | 'done';
  contextId?: string | null;
  projectId?: string | null;
  areaId?: string | null;
  personId?: string | null;
  dueAt?: string | null;
  scheduledAt?: string | null;
  reviewAt?: string | null;
  waitingFor?: string | null;
}

export function useTriage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; input: TriageInput }) =>
      apiSend<{ task: TaskDto }>('POST', `/inbox/${vars.id}/triage`, vars.input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDiscardInbox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiSend<{ task: TaskDto }>('POST', `/inbox/${id}/discard`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
