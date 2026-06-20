-- Migration: Create events table
-- Purpose: Store group events

CREATE TABLE IF NOT EXISTS events (
    id          TEXT PRIMARY KEY,
    group_id    TEXT NOT NULL,
    title       TEXT NOT NULL,
    description TEXT NOT NULL,
    date_time   DATETIME NOT NULL,
    created_by  TEXT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (group_id)
        REFERENCES groups(id)
        ON DELETE CASCADE,

    FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_group
ON events(group_id);

CREATE INDEX IF NOT EXISTS idx_events_creator
ON events(created_by);

CREATE INDEX IF NOT EXISTS idx_events_time
ON events(date_time);