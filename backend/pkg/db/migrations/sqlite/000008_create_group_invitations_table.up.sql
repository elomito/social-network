CREATE TABLE IF NOT EXISTS group_invitations (
    id TEXT PRIMARY KEY,

    group_id TEXT NOT NULL,

    inviter_id TEXT NOT NULL,
    invitee_id TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending','accepted','declined')),

    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    CONSTRAINT unique_group_invitation
        UNIQUE (group_id, invitee_id),

    FOREIGN KEY (group_id)
        REFERENCES groups(id)
        ON DELETE CASCADE,

    FOREIGN KEY (inviter_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (invitee_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);