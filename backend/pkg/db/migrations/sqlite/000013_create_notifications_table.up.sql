-- =============================================
-- Migration: Create notifications table
-- Purpose: Store system notifications for users
-- =============================================

CREATE TABLE IF NOT EXISTS notifications (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    receiver_id     INTEGER NOT NULL,           -- Who receives the notification
    sender_id       INTEGER,                    -- Who triggered it (can be NULL)
    type            TEXT NOT NULL,              -- e.g., 'follow_request', 'group_invite', 'event_created', 'join_request'
    target_id       INTEGER,                    -- ID of related item (post, group, event, etc.)
    content         TEXT,                       -- Short message shown to user
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id)   REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_notifications_receiver ON notifications(receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);