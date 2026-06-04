-- =============================================
-- Migration: Create private_messages table
-- Purpose: Store one-to-one private chat messages
-- =============================================

CREATE TABLE IF NOT EXISTS private_messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id       INTEGER NOT NULL,
    receiver_id     INTEGER NOT NULL,
    content         TEXT NOT NULL,
    image_path      TEXT,                    -- Optional image in message
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_read         BOOLEAN DEFAULT FALSE,   -- For read receipts

    -- Foreign keys (relationships)
    FOREIGN KEY (sender_id)   REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes (makes searching faster)
CREATE INDEX IF NOT EXISTS idx_pm_sender ON private_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_pm_receiver ON private_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_pm_created ON private_messages(created_at);