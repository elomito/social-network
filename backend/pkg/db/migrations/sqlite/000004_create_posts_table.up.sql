-- Migration: Create posts table
-- Purpose: Store user posts

CREATE TABLE IF NOT EXISTS posts (
    id                TEXT PRIMARY KEY,   -- UUID stored as TEXT
    author_id         TEXT NOT NULL,
    content           TEXT NOT NULL,
    image_url         TEXT,
    privacy_setting   TEXT NOT NULL CHECK (
        privacy_setting IN (
            'public',
            'almost_private',
            'private'
        )
    ),
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (author_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_author
ON posts(author_id);

CREATE INDEX IF NOT EXISTS idx_posts_created
ON posts(created_at);