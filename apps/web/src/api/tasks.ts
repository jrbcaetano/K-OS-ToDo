/**
 * Task-shaped DTOs that come back from the API.
 *
 * These mirror the Drizzle row shape but as plain JSON: timestamps come
 * across as ISO strings. Components consume `TaskDto` and convert dates
 * lazily where needed (e.g. the Today screen's bucketing logic).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend } from './client';

export interface TaskDto {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  status:
    | 'inbox'
    | 'next'
    | 'scheduled'
    | 'waiting'
    | 'delegated'
    | 'blocked'
    | 'someday'
    | 'done';
  priority: 'critical' | 'important' | 'routine' | 'low';
  contextId: string | null;
  projectId: string | null;
  areaId: string | null;
  personId: string | null;
  ownerId: string;
  sourceKind: string | null;
  sourceRef: string | null;
  dueAt: string | null;
  scheduledAt: string | null;
  reviewAt: string | null;
  completedAt: string | null;
  archivedAt: string | null;
  waitingFor: string | null;
  createdBy: string;
  createdAt: string;
}

export interface TaskEventDto {
  id: string;
  taskId: string;
  workspaceId: string;
  kind: string;
  actorKind: 'user' | 'agent' | 'system';
  actorUserId: string | null;
  payload: unknown;
  createdAt: string;
}

export interface TaskTagDto {
  id: string;
  name: string;
}

export function useTasksToday() {
  return useQuery({
    queryKey: ['tasks', 'today'],
    queryFn: () => apiGet<{ tasks: TaskDto[] }>('/tasks/today'),
    staleTime: 30_000,
  });
}

export function useTasksUpcoming() {
  return useQuery({
    queryKey: ['tasks', 'upcoming'],
    queryFn: () => apiGet<{ tasks: TaskDto[] }>('/tasks/upcoming'),
    staleTime: 30_000,
  });
}

export function useTasksWaiting() {
  return useQuery({
    queryKey: ['tasks', 'waiting'],
    queryFn: () => apiGet<{ tasks: TaskDto[] }>('/tasks/waiting'),
    staleTime: 30_000,
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ['task', id],
    enabled: !!id,
    queryFn: () =>
      apiGet<{ task: TaskDto; tags: TaskTagDto[]; events: TaskEventDto[] }>(`/tasks/${id}`),
    staleTime: 10_000,
  });
}

export type TaskPatch = Partial<{
  title: string;
  description: string | null;
  status: TaskDto['status'];
  priority: TaskDto['priority'];
  contextId: string | null;
  projectId: string | null;
  areaId: string | null;
  personId: string | null;
  ownerId: string;
  dueAt: string | null;
  scheduledAt: string | null;
  reviewAt: string | null;
  waitingFor: string | null;
}>;

export function usePatchTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; patch: TaskPatch }) =>
      apiSend<{ task: TaskDto }>('PATCH', `/tasks/${vars.id}`, vars.patch),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['task', vars.id] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['inbox'] });
    },
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiSend<{ task: TaskDto }>('POST', `/tasks/${id}/complete`),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['task', id] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useCommentOnTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; body: string }) =>
      apiSend<{ event: TaskEventDto }>('POST', `/tasks/${vars.id}/comment`, {
        body: vars.body,
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['task', vars.id] });
    },
  });
}
