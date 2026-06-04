-- =============================================
-- Migration: Create private_messages table
-- Purpose: Store one-to-one private chat messages
-- =============================================

CREATE TABLE IF NOT EXISTS private_messages (
    id            TEXT PRIMARY KEY,              -- UUID as TEXT
    sender_id     TEXT NOT NULL,
    receiver_id   TEXT NOT NULL,
    content       TEXT NOT NULL,
    image_path    TEXT,
    is_read       BOOLEAN DEFAULT FALSE,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (sender_id)   REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pm_sender ON private_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_pm_receiver ON private_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_pm_created ON private_messages(created_at);