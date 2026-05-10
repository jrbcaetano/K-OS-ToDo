/**
 * Projects DTOs + hooks (list / detail / archive lifecycle / linked people).
 *
 * Per docs/schema.md: archive is structured (reason from ARCHIVE_REASONS,
 * optional note, archived_by stamped server-side). Restore clears all four
 * fields together. Project progress is NOT stored — computed live from the
 * task list (see useProjectTasks + computeProgress).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend } from './client';
import type { TaskDto } from './tasks';

export type ArchiveReason = 'completed' | 'dropped' | 'paused' | 'replaced';
export type ProjectStatus = 'on_track' | 'needs_attention' | 'idle' | 'blocked';

export interface ProjectDto {
  id: string;
  workspaceId: string;
  name: string;
  outcome: string;
  contextId: string | null;
  status: ProjectStatus;
  targetDate: string | null;
  createdBy: string;
  createdAt: string;
  archivedAt: string | null;
  archiveReason: ArchiveReason | null;
  archiveNote: string | null;
  archivedBy: string | null;
}

export interface ProjectPersonDto {
  personId: string;
  role: string | null;
  name: string;
  initials: string;
  color: string | null;
}

export function useProjects(archived = false) {
  return useQuery({
    queryKey: ['projects', { archived }],
    queryFn: () =>
      apiGet<{ projects: ProjectDto[] }>(`/projects${archived ? '?archived=true' : ''}`),
    staleTime: 30_000,
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['project', id],
    enabled: !!id,
    queryFn: () => apiGet<{ project: ProjectDto }>(`/projects/${id}`),
    staleTime: 30_000,
  });
}

export function useProjectPeople(id: string | undefined) {
  return useQuery({
    queryKey: ['project', id, 'people'],
    enabled: !!id,
    queryFn: () => apiGet<{ people: ProjectPersonDto[] }>(`/projects/${id}/people`),
    staleTime: 30_000,
  });
}

export function useProjectTasks(id: string | undefined) {
  return useQuery({
    queryKey: ['project', id, 'tasks'],
    enabled: !!id,
    queryFn: () => apiGet<{ tasks: TaskDto[] }>(`/tasks?project_id=${encodeURIComponent(id ?? '')}`),
    staleTime: 30_000,
  });
}

export function useArchiveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; reason: ArchiveReason; note?: string | null }) =>
      apiSend<{ project: ProjectDto }>('POST', `/projects/${vars.id}/archive`, {
        reason: vars.reason,
        note: vars.note ?? null,
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['project', vars.id] });
    },
  });
}

export function useRestoreProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiSend<{ project: ProjectDto }>('POST', `/projects/${id}/restore`),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['project', id] });
    },
  });
}

export interface ProjectProgress {
  total: number;
  done: number;
  open: number;
  overdue: number;
  ratio: number; // 0..1
}

export function computeProgress(tasks: TaskDto[]): ProjectProgress {
  const now = Date.now();
  let done = 0;
  let overdue = 0;
  for (const t of tasks) {
    if (t.archivedAt) continue;
    if (t.status === 'done') done++;
    else if (t.dueAt && Date.parse(t.dueAt) < now) overdue++;
  }
  const considered = tasks.filter((t) => !t.archivedAt);
  const total = considered.length;
  return {
    total,
    done,
    open: total - done,
    overdue,
    ratio: total === 0 ? 0 : done / total,
  };
}
