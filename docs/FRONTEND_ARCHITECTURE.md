# Frontend Architecture Guide

Reference for the Macular Society chat frontend. Written to reflect actual patterns used in this codebase — not a generic template.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [State: What Goes Where](#state-what-goes-where)
4. [Data Fetching with TanStack Query](#data-fetching-with-tanstack-query)
5. [Streaming (SSE)](#streaming-sse)
6. [Component Patterns](#component-patterns)
7. [API Layer](#api-layer)
8. [TypeScript Conventions](#typescript-conventions)
9. [Key Rules Summary](#key-rules-summary)

---

## Tech Stack

| Concern | Library | Notes |
|---|---|---|
| Language | TypeScript 5 (strict) | No `any`. All props and responses typed. |
| Framework | React 18 | Functional components only |
| Build | Vite | Dev server + production build |
| Routing | React Router v6 | `useParams`, `useNavigate` |
| Server state | TanStack Query v5 | Caching, background refetch, mutations |
| UI components | MUI v5 | Theme via `ThemeProvider` in `App.tsx` |
| Styling | MUI `sx` prop + Emotion | No plain CSS files |

---

## Project Structure

```
src/
├── api/
│   └── client.ts              # All fetch logic — nothing else goes here
├── components/
│   ├── ChatView.tsx            # Chat area: streaming, messages, voice
│   ├── ChatInput.tsx           # Text input + voice recording controls
│   ├── ChatMessage.tsx         # Single message bubble + debug dialog trigger
│   ├── QueryDebugDialog.tsx    # RAG sources + full prompt inspector
│   └── SessionSidebar.tsx      # Session list, pin, delete
├── hooks/
│   ├── usePinnedSessions.ts    # localStorage-backed pin state
│   ├── useSession.ts           # TanStack Query: single session history
│   └── useSessions.ts          # TanStack Query: session list + delete mutation
├── providers/
│   └── QueryProvider.tsx       # QueryClient config + ReactQueryDevtools
├── types/
│   └── index.ts               # All shared TypeScript types
├── App.tsx                    # Layout + routing
└── main.tsx                   # React root, providers
```

### Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Files | `PascalCase.tsx` for components, `camelCase.ts` for hooks/utils | `ChatView.tsx`, `useSessions.ts` |
| Components | Named export, PascalCase | `export function ChatView()` |
| Hooks | `use` prefix | `useSession`, `useSessions` |
| Query key factories | exported const, noun + `QueryKey` suffix | `sessionsQueryKey`, `sessionQueryKey` |
| Types | PascalCase, `interface` or `type` | `Message`, `Session`, `Source` |

---

## State: What Goes Where

This is the most important architectural decision. There are three kinds of state, each with its own home.

### 1. Server state → TanStack Query

Any data that lives on the server belongs in TanStack Query — not in `useState`. This includes the sessions list and session history.

**Why:** TanStack Query gives you caching, background refetching, deduplication, retries, and cache invalidation for free. `useState` gives you none of these.

```tsx
// The sessions list — cached, auto-refetches after invalidation
const { data: sessions = [], isPending } = useSessions();

// A single session's history — only fetches when sessionId is defined
const { data: sessionData } = useSession(sessionId);
```

**Rule:** If you're writing `useState` + `useEffect` + `fetch`, that's a signal the data should be in a query hook instead.

### 2. Client UI state → `useState` (local)

Ephemeral state that doesn't need to be shared lives in the component that owns it:

- `loading` — is a request in flight?
- `error` — is there an error to show?
- `deleteDialogOpen` — is the confirm dialog open?
- `voiceEnabled` — user's voice preference (also persisted to localStorage)
- `messages` — the live, streaming-assembled message list in ChatView

### 3. Refs for mutable non-rendering values → `useRef`

Values that change but don't need to trigger re-renders:

- `isStreamingRef` — guards against useSession overwriting live streaming state
- `audioRef` — reference to the currently playing Audio element
- `messagesEndRef` — DOM node to scroll to on new messages

### 4. What we deliberately don't have

- **No Redux / Zustand / Jotai** — the app is small enough that TanStack Query + local state covers everything.
- **No React Context** — there's no shared subtree state that crosses the ChatView ↔ SessionSidebar boundary. Cross-component updates happen through cache invalidation.
- **No global state for sessions** — the sidebar subscribes to the `['sessions']` cache key and updates automatically when that key is invalidated.

---

## Data Fetching with TanStack Query

### QueryClient setup

`QueryProvider` at the top of the tree (`main.tsx`) provides a single `QueryClient` instance to the whole app:

```tsx
// providers/QueryProvider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,  // data is "fresh" for 30s — no refetch unless stale
      retry: 2,           // retry failed queries twice
    },
  },
});
```

`staleTime` is the key concept: within the stale window, `useQuery` returns cached data instantly and makes no network request, even on component remount or window focus. After it expires, the next access triggers a background refetch while still serving cached data immediately.

### Query key factories

Every query hook exports a key factory function. **This is not optional** — it's what allows mutations to invalidate the correct cache entries:

```tsx
// hooks/useSessions.ts
export const sessionsQueryKey = () => ['sessions'] as const;

// hooks/useSession.ts
export const sessionQueryKey = (sessionId: string) => ['session', sessionId] as const;
```

The `as const` ensures TypeScript infers the literal tuple type, which enables strict type checking on invalidation calls.

**Rule:** Never write `['sessions']` as a raw literal anywhere outside the hook file. Always import and call the factory.

### Query hooks

```tsx
// hooks/useSessions.ts
export function useSessions() {
  return useQuery({
    queryKey: sessionsQueryKey(),
    queryFn: listSessions,
    staleTime: 30_000,
  });
}
```

```tsx
// hooks/useSession.ts
export function useSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: sessionQueryKey(sessionId ?? ''),
    queryFn: () => getSession(sessionId!),
    enabled: !!sessionId,   // query is idle when sessionId is undefined
    staleTime: 0,           // always reload history when navigating to a session
    retry: 1,
  });
}
```

**The `enabled` pattern** is how you write conditional queries. Never guard `useQuery` with an `if` statement — hooks must be called unconditionally. Use `enabled: !!value` instead.

### Mutations

```tsx
// hooks/useSessions.ts
export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => deleteSession(sessionId),
    onSuccess: (_data, sessionId) => {
      // Evict the deleted session's history from cache
      queryClient.removeQueries({ queryKey: sessionQueryKey(sessionId) });
      // Mark the sessions list as stale → triggers refetch in SessionSidebar
      queryClient.invalidateQueries({ queryKey: sessionsQueryKey() });
    },
  });
}
```

**`invalidateQueries` vs `removeQueries`:**
- `invalidateQueries` — marks data stale, triggers background refetch for any active subscriber.
- `removeQueries` — evicts data entirely. Use when the resource no longer exists (e.g. after delete).
- `setQueryData` — update the cache directly without a network call (use for optimistic updates).

### Cache invalidation after streaming

After a chat stream completes, the sidebar's session list needs to show the updated message count. Instead of a callback prop (`onSessionUpdate`), ChatView invalidates the cache directly:

```tsx
// components/ChatView.tsx
const queryClient = useQueryClient();

// Inside the 'done' event handler:
queryClient.invalidateQueries({ queryKey: sessionsQueryKey() });
```

SessionSidebar's `useSessions()` is subscribed to that key and refetches automatically. No prop drilling required.

### DevTools

The React Query DevTools panel is mounted in `QueryProvider` and only included in development builds (automatically tree-shaken in production). Open it by clicking the TanStack logo in the bottom-right corner of the app. It shows:

- All active cache entries and their state (fresh / stale / fetching / error)
- Query key structure
- When data was last fetched
- How many observers are subscribed to each key

---

## Streaming (SSE)

The chat response is delivered as a Server-Sent Events stream. This is the one place where standard TanStack Query patterns don't apply — you can't cache a live stream, and the UI updates incrementally with each chunk.

The pattern used in `ChatView.handleSend`:

```
1. Set isStreamingRef.current = true (guards useSession from overwriting messages)
2. Optimistically add user message to local state with a stable UUID key
3. Open stream via sendQueryStream() async generator
4. On 'chunk' events: accumulate content, add or update assistant message
5. On 'tool' event: replace streamed content with tool response
6. On 'done' event:
   - Attach RAG metadata (sources, fullPrompt, token count) to last message
   - Call queryClient.invalidateQueries({ queryKey: sessionsQueryKey() })
7. On error: revert optimistic messages, show error alert
8. Finally: isStreamingRef.current = false, setLoading(false)
```

**Key detail — stable message keys during streaming:**

Messages are assigned `id: crypto.randomUUID()` when created, not when they arrive from the server. This gives React a stable key to reconcile against, even as the message content changes chunk by chunk.

**The `isStreamingRef` guard:**

`useSession` refetches when `sessionId` changes. Without the guard, navigating back to a session mid-stream would overwrite the partially-assembled assistant message with stale server data. The ref blocks `setMessages` in the `useEffect` while streaming is active.

---

## Component Patterns

### Components don't fetch — hooks do

Components receive data from hooks and render it. They don't call `listSessions()` or `getSession()` directly. This makes components easier to test and reuse.

```tsx
// ✅ Correct
function SessionSidebar() {
  const { data: sessions = [], isPending } = useSessions();
  // ...render
}

// ❌ Wrong — fetching in component body
function SessionSidebar() {
  const [sessions, setSessions] = useState([]);
  useEffect(() => { listSessions().then(setSessions); }, []);
}
```

### Always handle all async states

```tsx
const { data: sessions = [], isPending, isError } = useSessions();

if (isPending) return <LoadingIndicator />;
if (isError) return <ErrorMessage />;
// data is guaranteed to be defined here
```

### Prop callbacks for component-internal events only

The delete confirmation dialog, pin toggle, and navigation are all local to `SessionSidebar` — no props needed. The only prop `SessionSidebar` accepts is `onNewSession`, which is a router-level concern owned by `App`.

```tsx
// SessionSidebar only needs one prop — everything else is self-contained
interface SessionSidebarProps {
  onNewSession: () => void;
}
```

### MUI `sx` prop for styling

Styles live inline on the component via MUI's `sx` prop. No separate CSS files, no `styled()` wrappers unless the logic is complex enough to warrant extracting.

```tsx
<Box sx={{ display: 'flex', height: '100vh' }}>
```

---

## API Layer

All network calls live in [`api/client.ts`](../projects/frontend/src/api/client.ts). No component or hook imports `fetch` directly.

The thin wrapper `apiFetch` injects two headers on every request:

- `X-Request-Id` — a UUID generated per request, used for tracing in nginx logs
- `X-Rag-Session-Id` — the current session ID, injected when present

**Functions exposed by client.ts:**

| Function | Method | Purpose |
|---|---|---|
| `listSessions()` | GET | All sessions with message counts |
| `getSession(id)` | GET | Single session + full message history |
| `deleteSession(id)` | DELETE | Delete a session |
| `sendQueryStream(query, sessionId)` | POST (SSE) | Streaming chat response |
| `sendVoiceQuery(blob, sessionId)` | POST | Voice input → transcription + response |
| `synthesizeSpeech(text)` | POST | Text → WAV audio blob |

**Rule:** When adding a new API call, add it to `client.ts` first, then wrap it in a TanStack Query hook in `hooks/`.

---

## TypeScript Conventions

### Strict mode, no `any`

`tsconfig.json` has `"strict": true`. Use `unknown` at boundaries you can't type statically (e.g. `catch (err)` — cast to `Error` after checking).

### Types in `types/index.ts`

Shared types live in one file for this app's size. If types grow significantly, split by domain (`types/session.ts`, `types/message.ts`, etc.).

### Typing query results

```tsx
// TanStack Query infers the return type from queryFn automatically.
// You don't need to annotate the result type explicitly:
const { data } = useSessions();
//     ^? (Session & { messageCount: number })[] | undefined

// The hook's queryFn return type flows through to data.
```

### `as const` on query keys

```tsx
export const sessionsQueryKey = () => ['sessions'] as const;
//                                                 ^^^^^^^^
// Without as const, TypeScript infers string[], not ['sessions'].
// The literal type is needed for precise invalidation matching.
```

### The `id` field on `Message`

The `id` field in the `Message` type is optional (`id?: number`) because messages from the server have numeric database IDs, but locally-created messages (optimistic UI during streaming) are assigned `crypto.randomUUID()` cast to `number`. If you change the backend to return string IDs, update the type to `id?: string` and drop the cast.

---

## Key Rules Summary

| Rule | Why |
|---|---|
| Server data in TanStack Query, never `useState` | Caching, retries, deduplication for free |
| Export query key factories from hook files | Enables precise cache invalidation anywhere |
| `enabled: !!value` for conditional queries | Hooks must always be called; never wrap in `if` |
| `invalidateQueries` after mutations and after stream 'done' | Keeps sidebar in sync without prop drilling |
| `isStreamingRef` guards `useSession` effect | Prevents stale server data overwriting live stream |
| Messages keyed by `id` (UUID), never by array index | Stable reconciliation during streaming updates |
| All fetch calls in `api/client.ts` | Single place to add headers, error handling, tracing |
| Components receive data from hooks, don't fetch directly | Testable, reusable, single responsibility |
| No plain CSS — use MUI `sx` prop | Consistency with MUI theme system |
