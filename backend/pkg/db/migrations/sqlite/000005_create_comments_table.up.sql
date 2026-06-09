-- Migration: Create comments table
-- Purpose: Store comments on posts

CREATE TABLE IF NOT EXISTS comments (
    id            TEXT PRIMARY KEY,
    post_id       TEXT NOT NULL,
    author_id     TEXT NOT NULL,
    content       TEXT NOT NULL,
    image_path    TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (post_id)
        REFERENCES posts(id)
        ON DELETE CASCADE,

    FOREIGN KEY (author_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comments_post
ON comments(post_id);

CREATE INDEX IF NOT EXISTS idx_comments_author
ON comments(author_id);

CREATE INDEX IF NOT EXISTS idx_comments_created
ON comments(created_at);