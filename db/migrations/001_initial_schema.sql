-- Migration: 001_initial_schema
-- Description: Initial PostgreSQL schema with pgvector for embeddings and session management
-- Replaces: Qdrant (vector DB) + Redis (session state)

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- EMBEDDINGS (replaces Qdrant)
-- =============================================================================

-- Document chunks with embeddings
CREATE TABLE IF NOT EXISTS chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Content
    text TEXT NOT NULL,
    embedding vector(1024) NOT NULL,  -- Match EMBED_MODEL dimension (gte-large = 1024)

    -- Metadata
    source_file TEXT NOT NULL,        -- Original file name
    chunk_index INTEGER NOT NULL,     -- Position in source document
    chunk_length INTEGER NOT NULL,    -- Character count

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate chunks from same source
    UNIQUE(source_file, chunk_index)
);

-- HNSW index for fast approximate nearest neighbor search
-- m = max connections per layer, ef_construction = size of dynamic candidate list
CREATE INDEX IF NOT EXISTS chunks_embedding_idx
ON chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Index for filtering by source
CREATE INDEX IF NOT EXISTS chunks_source_file_idx ON chunks(source_file);

-- =============================================================================
-- CONVERSATION SESSIONS (replaces Redis hash)
-- =============================================================================

CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,

    -- User info (collected during callback flow)
    user_phone TEXT,
    user_name TEXT,
    preferred_call_time TEXT,

    -- Flow state
    collection_state TEXT NOT NULL DEFAULT 'idle',
    callback_topic TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Index for cleanup job
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

-- =============================================================================
-- CONVERSATION MESSAGES (replaces Redis list)
-- =============================================================================

CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,

    -- Message content
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,

    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for retrieving messages by session
CREATE INDEX IF NOT EXISTS messages_session_id_idx ON messages(session_id, created_at DESC);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update sessions.updated_at
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to cleanup expired sessions (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE chunks IS 'Document chunks with vector embeddings for RAG retrieval';
COMMENT ON TABLE sessions IS 'Conversation sessions with user state and callback flow';
COMMENT ON TABLE messages IS 'Conversation message history per session';
COMMENT ON FUNCTION cleanup_expired_sessions IS 'Removes expired sessions - call periodically via cron or pg_cron';
