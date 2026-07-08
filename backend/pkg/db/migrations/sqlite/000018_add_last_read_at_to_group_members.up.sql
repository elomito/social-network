-- Migration: add last_read_at to group_members table
ALTER TABLE group_members ADD COLUMN last_read_at TEXT NOT NULL DEFAULT '1970-01-01 00:00:00';
