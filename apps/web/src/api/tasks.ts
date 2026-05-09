/**
 * Task-shaped DTOs that come back from the API.
 *
 * These mirror the Drizzle row shape but as plain JSON: timestamps come
 * across as ISO strings. Components consume `TaskDto` and convert dates
 * lazily where needed (e.g. the Today screen's bucketing logic).
 */

import { useQuery } from '@tanstack/react-query';
import { apiGet } from './client';

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

export function useTasksToday() {
  return useQuery({
    queryKey: ['tasks', 'today'],
    queryFn: () => apiGet<{ tasks: TaskDto[] }>('/tasks/today'),
    staleTime: 30_000,
  });
}
