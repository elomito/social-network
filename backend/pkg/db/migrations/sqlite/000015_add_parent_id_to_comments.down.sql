-- Migration: Remove parent_id from comments table
DROP INDEX IF EXISTS idx_comments_parent;
ALTER TABLE comments DROP COLUMN parent_id;
