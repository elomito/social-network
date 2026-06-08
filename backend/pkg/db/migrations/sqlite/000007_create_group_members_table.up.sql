CREATE TABLE IF NOT EXISTS group_members (
    id TEXT PRIMARY KEY,

    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,

    role TEXT NOT NULL,

    joined_at TEXT NOT NULL DEFAULT (datetime('now')),

    CONSTRAINT unique_group_membership
        UNIQUE (group_id, user_id),

    FOREIGN KEY (group_id)
        REFERENCES groups(id)
        ON DELETE CASCADE,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);