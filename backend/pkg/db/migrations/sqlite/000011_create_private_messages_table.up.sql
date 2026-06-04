-- =============================================
-- Migration: Create private_messages table
-- Purpose: Store one-to-one private chat messages
-- =============================================

CREATE TABLE IF NOT EXISTS private_messages (
    id            TEXT PRIMARY KEY,           -- UUID stored as TEXT
    sender_id     TEXT NOT NULL,
    recipient_id  TEXT NOT NULL,               -- Must match model (RecipientID)
    content       TEXT NOT NULL,
    image_path    TEXT,
    is_read       BOOLEAN DEFAULT FALSE,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (sender_id)    REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pm_sender ON private_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_pm_recipient ON private_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_pm_created ON private_messages(created_at);