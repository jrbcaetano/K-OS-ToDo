/**
 * Platform-admin endpoints. All require platformRole='admin' server-side;
 * the UI hides the entry points for everyone else.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend } from './client';

export interface PendingApproval {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export function useApprovals() {
  return useQuery({
    queryKey: ['admin', 'approvals'],
    queryFn: () => apiGet<{ approvals: PendingApproval[] }>('/admin/approvals'),
    staleTime: 10_000,
  });
}

export function useApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiSend<{ user: { id: string } }>('POST', `/admin/approvals/${userId}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'approvals'] });
    },
  });
}

export function useReject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiSend<{ user: { id: string } }>('POST', `/admin/approvals/${userId}/reject`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'approvals'] });
    },
  });
}
