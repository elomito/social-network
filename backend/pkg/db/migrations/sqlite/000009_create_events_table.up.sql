-- Migration: Create events table
-- Purpose: Store group events

CREATE TABLE IF NOT EXISTS events (
    id            TEXT PRIMARY KEY,
    group_id      TEXT NOT NULL,
    creator_id    TEXT NOT NULL,
    title         TEXT NOT NULL,
    description   TEXT NOT NULL,
    event_time    DATETIME NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (group_id)
        REFERENCES groups(id)
        ON DELETE CASCADE,

    FOREIGN KEY (creator_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_group
ON events(group_id);

CREATE INDEX IF NOT EXISTS idx_events_creator
ON events(creator_id);

CREATE INDEX IF NOT EXISTS idx_events_time
ON events(event_time);