ALTER TABLE users ADD COLUMN cover_image_id TEXT REFERENCES images(id);
