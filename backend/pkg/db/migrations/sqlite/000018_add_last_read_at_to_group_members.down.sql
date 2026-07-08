-- Migration: remove last_read_at from group_members table
-- SQLite support for DROP COLUMN depends on version, but this is the standard syntax.
ALTER TABLE group_members DROP COLUMN last_read_at;
