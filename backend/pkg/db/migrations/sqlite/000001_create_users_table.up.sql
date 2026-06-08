-- Migration: create users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    nickname TEXT,
    date_of_birth TEXT NOT NULL,
    avatar_image_id TEXT,
    FOREIGN KEY (avatar_image_id) REFERENCES images(id),
    about_me TEXT,
    is_public INTEGER NOT NULL DEFAULT 1
    CHECK (is_public IN (0,1))
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_active_at TEXT,
    deleted_at TEXT
);


CREATE INDEX IF NOT EXISTS idx_users_avatar_image_id ON users(avatar_image_id);
