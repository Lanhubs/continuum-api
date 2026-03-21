-- Migration to fix user_id type mismatch
-- Changes user_id from UUID to TEXT to match better-auth Nanoids

ALTER TABLE documents 
ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- Update index for the new type
DROP INDEX IF EXISTS idx_documents_user_id;
CREATE INDEX idx_documents_user_id ON documents(user_id);
