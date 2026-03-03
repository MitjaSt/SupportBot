import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

/**
 * QueryClient is the central cache for all server state.
 *
 * defaultOptions apply to every query unless overridden at the call site:
 * - staleTime: 30s — data is considered "fresh" for 30 seconds after being
 *   fetched. Within that window, useQuery returns cached data without any
 *   network request (even on component remount or window focus).
 * - retry: 2 — failed queries are retried twice before surfacing an error.
 *
 * Individual queries can override these with their own options, e.g.
 * staleTime: 0 for data that must always be fresh (session history).
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
});

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools panel — only included in development builds (tree-shaken in prod) */}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="top-left" />
    </QueryClientProvider>
  );
}
