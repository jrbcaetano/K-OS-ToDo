/**
 * Reusable hooks that wrap the auth API surface.
 *
 * Both __root.tsx (auth gate + user pill) and the screens (greeting,
 * topbar meta) need the current session. Sharing one hook keeps the
 * query key consistent so we get a single cache entry.
 */

import { useQuery } from '@tanstack/react-query';
import { getSession } from './auth';

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: getSession,
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
