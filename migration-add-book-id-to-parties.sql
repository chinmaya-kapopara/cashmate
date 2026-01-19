-- Migration: Add book_id to parties table
-- This makes parties book-specific instead of global

-- Step 1: Add book_id column to parties table
ALTER TABLE parties 
ADD COLUMN IF NOT EXISTS book_id BIGINT REFERENCES books(id) ON DELETE CASCADE;

-- Step 2: Remove the old unique constraint on name
ALTER TABLE parties 
DROP CONSTRAINT IF EXISTS parties_name_key;

-- Step 3: Add new unique constraint on (book_id, name)
ALTER TABLE parties 
ADD CONSTRAINT parties_book_id_name_unique UNIQUE (book_id, name);

-- Step 4: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_parties_book_id ON parties(book_id);

-- Step 5: Update existing parties to be associated with the first book
-- This is a one-time migration for existing data
-- If you have multiple books, you may need to manually assign parties to the correct books
UPDATE parties 
SET book_id = (SELECT id FROM books ORDER BY created_at ASC LIMIT 1)
WHERE book_id IS NULL;

-- Step 6: Make book_id NOT NULL after updating existing data
ALTER TABLE parties 
ALTER COLUMN book_id SET NOT NULL;
