# ADR-006: Frontend Architecture — React, TanStack Query, and SSE Client

**Status:** Accepted

## Context

The frontend is a single-page chat interface. It needs to handle real-time streaming responses, manage a session list that stays in sync after mutations, and do so without the overhead of a large state management library. The RAG responses can be slow, so perceived responsiveness (streaming, optimistic UI) matters.

## Decision

Build with **React 18 + TypeScript** and **Vite**. Use **TanStack Query v5** for server state. Keep all network logic in a single `api/client.ts` module. Consume the SSE streaming endpoint with an **async generator** parsed in the component. Use **Material UI (MUI) v5** for components.

## Rationale

**TanStack Query over Redux, Zustand, or Context API:**
- Session list and session history are classic server state — fetched, cached, and invalidated on mutation
- TanStack Query handles stale-while-revalidate, loading/error states, and cache invalidation with minimal boilerplate
- After a stream completes, `queryClient.invalidateQueries()` triggers automatic refetches across all components subscribed to that key, removing the need for manual state synchronisation
- Redux and Zustand would require wiring up actions and reducers for behaviour the query library gives for free

**Async generator for SSE consumption:**
- The streaming endpoint emits `data: {json}\n\n` events which map naturally to `yield` in an async generator
- `for await...of` in the component iterates the stream and updates local message state chunk by chunk
- This avoids a separate EventSource or rxjs dependency while keeping the consuming code readable

**Optimistic streaming UI:**
- User messages are added to local state immediately with `crypto.randomUUID()` as a temporary key — no waiting for a round trip
- As SSE chunks arrive the assistant message is created or updated in place
- An `isStreamingRef` guards against the session query overwriting live streaming state between refetches

**Single `api/client.ts` module:**
- All fetch calls live in one place, injecting common headers (`X-Request-Id`, `X-Rag-Session-Id`) via a thin `apiFetch()` wrapper
- Components and hooks import named functions (`sendQueryStream`, `listSessions`, etc.) rather than constructing URLs themselves
- Makes API contract changes a one-file change

**Vite over Create React App:**
- Near-instant HMR and faster production builds
- CRA is no longer maintained

**MUI over Tailwind or plain CSS:**
- Provides accessible, ready-to-use components (dialogs, chips, alerts) that match the charitable/medical context
- MUI's `sx` prop keeps styles co-located with markup without a separate CSS file per component

## Consequences

- Streaming state (in-progress assistant messages) lives in `useState` inside `ChatView`, not in TanStack Query cache — this is intentional; the cache is populated only after the stream finishes
- `isStreamingRef` must be set to `false` in all exit paths of the stream loop (completion, error, abort) to allow session queries to resume
- Query key factories (`sessionsQueryKey`, `sessionQueryKey`) must be used consistently — string keys scattered across files will cause cache misses
- MUI version upgrades (v5 → v6) involve breaking changes to `sx` and `styled`; pin the major version
