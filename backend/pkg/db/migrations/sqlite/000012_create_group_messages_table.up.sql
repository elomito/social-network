-- =============================================
-- Migration: Create group_messages table
-- Purpose: Store messages sent in group chats
-- =============================================

CREATE TABLE IF NOT EXISTS group_messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id        INTEGER NOT NULL,
    sender_id       INTEGER NOT NULL,
    content         TEXT NOT NULL,
    image_path      TEXT,                       -- Optional image/GIF
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    FOREIGN KEY (group_id)  REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gm_group ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_gm_sender ON group_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_gm_created ON group_messages(created_at);