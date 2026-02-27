import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteSession, listSessions } from '../api/client';
import { sessionQueryKey } from './useSession';

/**
 * Query key factory for the sessions list.
 *
 * Exporting this function is the key pattern: other code (mutations,
 * post-stream invalidation) imports and uses this to target the exact
 * cache entry. Never write ['sessions'] as a raw literal elsewhere —
 * always use this factory so refactors stay consistent.
 */
export const sessionsQueryKey = () => ['sessions'] as const;

/**
 * Fetches and caches the full list of sessions shown in the sidebar.
 *
 * Because the sidebar is always mounted, this query effectively acts as
 * a polling source — any invalidation (after send, after delete) will
 * trigger a background refetch and the sidebar updates automatically.
 *
 * staleTime: 30s — avoids refetching on every minor re-render while
 * still staying reasonably fresh.
 */
export function useSessions() {
  return useQuery({
    queryKey: sessionsQueryKey(),
    queryFn: listSessions,
    staleTime: 30_000,
  });
}

/**
 * Mutation for deleting a session.
 *
 * onSuccess runs after the DELETE request resolves successfully:
 * 1. removeQueries — immediately evicts the cached session history so
 *    navigating back to it won't flash stale data.
 * 2. invalidateQueries — marks the sessions list as stale and triggers
 *    a background refetch, so the sidebar updates without any prop drilling.
 *
 * The component that calls mutate() doesn't need to know any of this —
 * the cache management is fully encapsulated in the hook.
 */
export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => deleteSession(sessionId),
    onSuccess: (_data, sessionId) => {
      queryClient.removeQueries({ queryKey: sessionQueryKey(sessionId) });
      queryClient.invalidateQueries({ queryKey: sessionsQueryKey() });
    },
  });
}
