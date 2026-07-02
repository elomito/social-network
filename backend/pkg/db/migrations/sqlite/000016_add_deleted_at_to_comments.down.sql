-- Migration: Remove deleted_at column from comments table (rollback)

DROP INDEX IF EXISTS idx_comments_deleted_at;

-- SQLite doesn't support DROP COLUMN in older versions, but we can recreate the table
-- For simplicity, we just drop the index since the column will remain but be unused
