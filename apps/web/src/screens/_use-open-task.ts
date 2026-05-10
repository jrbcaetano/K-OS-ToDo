/**
 * Shared "open this task in the detail screen" navigation helper. Every
 * list screen reaches for this so click-through is consistent.
 */

import { useNavigate } from '@tanstack/react-router';
import type { TaskRowModel } from '@k-os/ui';

export function useOpenTask(): (task: TaskRowModel) => void {
  const navigate = useNavigate();
  return (task) => navigate({ to: '/tasks/$id', params: { id: task.id } });
}
