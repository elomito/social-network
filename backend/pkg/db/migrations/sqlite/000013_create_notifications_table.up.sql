-- =============================================
-- Migration: Create notifications table
-- Purpose: Store user notifications
-- =============================================

CREATE TABLE IF NOT EXISTS notifications (
    id            TEXT PRIMARY KEY,
    recipient_id  TEXT NOT NULL,
    initiator_id  TEXT,                       -- Can be NULL
    type          TEXT NOT NULL,
    reference_id  TEXT,                       -- Can reference post, group, event, etc.
    message       TEXT,
    is_read       BOOLEAN DEFAULT FALSE,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (initiator_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notif_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notif_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notif_type ON notifications(type);