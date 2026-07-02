-- Migration: Add deleted_at column to comments table
-- Purpose: Support soft deletion of comments

ALTER TABLE comments ADD COLUMN deleted_at DATETIME;

-- Index for filtering non-deleted comments
CREATE INDEX IF NOT EXISTS idx_comments_deleted_at ON comments(deleted_at);
