/**
 * People hooks. Loops are computed client-side: the open-loops view query
 * is just `/tasks?person_id=:id&archived=false` filtered by status.
 *
 * "They owe you" vs "you owe them" semantics per the schema doc:
 *   - they owe you: person_id = X AND owner_id != currentUser
 *   - you owe them: person_id = X AND owner_id = currentUser
 *
 * Until /me lands (so we know currentUser.id), the detail screen treats
 * every linked task as "open loop" and surfaces the count without splitting.
 */

import { useQuery } from '@tanstack/react-query';
import { apiGet } from './client';
import type { TaskDto } from './tasks';

export interface PersonDto {
  id: string;
  workspaceId: string;
  name: string;
  initials: string;
  contextId: string | null;
  role: string | null;
  color: string;
  lastSeenAt: string | null;
  nextMeetingAt: string | null;
  archivedAt: string | null;
  createdBy: string;
  createdAt: string;
}

export function usePeople(archived = false) {
  return useQuery({
    queryKey: ['people', { archived }],
    queryFn: () =>
      apiGet<{ people: PersonDto[] }>(`/people${archived ? '?archived=true' : ''}`),
    staleTime: 30_000,
  });
}

export function usePerson(id: string | undefined) {
  return useQuery({
    queryKey: ['person', id],
    enabled: !!id,
    queryFn: () => apiGet<{ person: PersonDto }>(`/people/${id}`),
    staleTime: 30_000,
  });
}

export function usePersonTasks(id: string | undefined) {
  return useQuery({
    queryKey: ['person', id, 'tasks'],
    enabled: !!id,
    queryFn: () => apiGet<{ tasks: TaskDto[] }>(`/tasks?person_id=${encodeURIComponent(id ?? '')}`),
    staleTime: 30_000,
  });
}
