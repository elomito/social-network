-- Migration: create groups table

CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,

    title TEXT NOT NULL,
    description TEXT NOT NULL,

    creator_id TEXT NOT NULL,

    cover_image_id TEXT,

    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    is_active INTEGER NOT NULL DEFAULT 1
        CHECK (is_active IN (0,1)),

    deleted_at TEXT,

    FOREIGN KEY (creator_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_groups_creator_id
ON groups(creator_id);