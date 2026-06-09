-- Migration: Create event_responses table
-- Purpose: Store event RSVP responses

CREATE TABLE IF NOT EXISTS event_responses (
    event_id      TEXT NOT NULL,
    user_id       TEXT NOT NULL,
    status        TEXT NOT NULL CHECK (
        status IN (
            'going',
            'not_going'
        )
    ),
    responded_at  DATETIME DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (event_id, user_id),

    FOREIGN KEY (event_id)
        REFERENCES events(id)
        ON DELETE CASCADE,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_responses_event
ON event_responses(event_id);

CREATE INDEX IF NOT EXISTS idx_event_responses_user
ON event_responses(user_id);