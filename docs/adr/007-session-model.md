# ADR-007: Stateless Sessions Without Authentication

**Status:** Accepted

## Context

The chatbot is a public-facing service for people affected by macular disease. Users should be able to start a conversation immediately without creating an account. At the same time we need some concept of continuity — users returning to the same conversation should see their history, and the system needs to correlate messages within a session for context.

## Decision

Use **anonymous sessions identified by a UUID** generated client-side. There is no authentication. The session ID is passed in the request body (or as a query parameter for voice requests) and is trusted as-is.

## Rationale

**No authentication:**
- The service provides publicly available health information — there is no private data to protect behind a login
- Requiring registration would create a barrier for a demographic (older adults with vision impairment) that may find account creation difficult
- Anonymous access is consistent with the charity's mission of open access to information

**Client-generated session UUIDs:**
- The client generates a `crypto.randomUUID()` on first load and stores it in `localStorage`
- This avoids a session-creation round trip before the first message can be sent
- UUIDs are sufficiently random (122 bits of entropy) that enumeration attacks are not practical
- If a user clears their local storage, they start a new session — this is acceptable given the nature of the service

**Session expiry:**
- Sessions expire after 24 hours (configurable via `SESSION_TTL_HOURS`)
- A background cleanup task deletes expired sessions from the database
- This bounds storage growth without requiring users to explicitly close sessions

**Contact collection state machine:**
- Sessions track a `collectionState` enum (7 states) for the optional user contact info flow
- This state lives in the session record rather than being reconstructed from message history, making transitions explicit and auditable

## Consequences

- There is no way to recover a session if the client loses its `localStorage` (e.g. incognito mode, cleared browser data) — this is a deliberate trade-off for frictionless access
- The session ID in request bodies must be validated (non-empty string) but cannot be verified against a signed token; rate limiting is the primary abuse-prevention mechanism
- If the service ever needs to handle genuinely private data (e.g. medical records), this ADR must be revisited and an authentication layer added
- Administrators accessing `/admin/*` routes need a separate authentication mechanism — this is outside the scope of this ADR
