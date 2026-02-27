import { useQuery } from '@tanstack/react-query';
import { getSession } from '../api/client';

/**
 * Query key factory for a single session.
 *
 * Including the sessionId in the key means each session gets its own
 * cache entry — navigating between sessions never shows the wrong data.
 * The factory is exported so useDeleteSession can evict the correct entry.
 */
export const sessionQueryKey = (sessionId: string) =>
  ['session', sessionId] as const;

/**
 * Loads an existing session's message history.
 *
 * enabled: !!sessionId — the query only fires when a sessionId is present.
 * While disabled the query stays in 'pending' state but makes no network
 * request. This is the idiomatic pattern for conditional queries; never
 * guard with an if-statement around useQuery.
 *
 * staleTime: 0 — history must always be fresh when navigating to a session.
 * Cached history could be missing messages added in a previous visit.
 *
 * retry: 1 — on 404 (session not found) a single retry is enough before
 * we surface the error to the component so it can redirect.
 */
export function useSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: sessionQueryKey(sessionId ?? ''),
    queryFn: () => getSession(sessionId!),
    enabled: !!sessionId,
    staleTime: 0,
    retry: 1,
  });
}
