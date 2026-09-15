CREATE TABLE groups (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    invite_code TEXT NOT NULL UNIQUE,
    owner_hash TEXT NOT NULL UNIQUE,
    settings JSONB NOT NULL CHECK (jsonb_typeof(settings) = 'object'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE members (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    preferences JSONB NOT NULL CHECK (jsonb_typeof(preferences) = 'object'),
    organizer BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sequence BIGINT GENERATED ALWAYS AS IDENTITY
);

CREATE INDEX members_group ON members(group_id, created_at, sequence);
CREATE UNIQUE INDEX one_organizer_per_group ON members(group_id) WHERE organizer;
