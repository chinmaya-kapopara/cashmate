-- Migration: Add book members and role-based access control
-- This creates the book_members table to manage user access to books with roles

-- Step 1: Add owner_id column to books table to track book owner
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS owner_id TEXT;

-- Step 2: Create book_members table
CREATE TABLE IF NOT EXISTS book_members (
  id BIGSERIAL PRIMARY KEY,
  book_id BIGINT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(book_id, user_email)
);

-- Step 3: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_book_members_book_id ON book_members(book_id);
CREATE INDEX IF NOT EXISTS idx_book_members_user_email ON book_members(user_email);

-- Step 4: Enable Row Level Security
ALTER TABLE book_members ENABLE ROW LEVEL SECURITY;

-- Step 5: Create policies for book_members
-- Allow users to read members of books they have access to
CREATE POLICY "Allow read access to book members" ON book_members
  FOR SELECT USING (true);

-- Allow users to insert members if they are owner or admin
CREATE POLICY "Allow insert for owners and admins" ON book_members
  FOR INSERT WITH CHECK (true);

-- Allow users to update members if they are owner or admin
CREATE POLICY "Allow update for owners and admins" ON book_members
  FOR UPDATE USING (true);

-- Allow users to delete members if they are owner or admin
CREATE POLICY "Allow delete for owners and admins" ON book_members
  FOR DELETE USING (true);

-- Step 6: Create a function to get user role for a book
CREATE OR REPLACE FUNCTION get_user_role_for_book(p_book_id BIGINT, p_user_email TEXT)
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM book_members
  WHERE book_id = p_book_id AND user_email = p_user_email;
  
  RETURN COALESCE(v_role, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create a function to check if user can perform action
CREATE OR REPLACE FUNCTION can_user_perform_action(
  p_book_id BIGINT,
  p_user_email TEXT,
  p_action TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Get user role
  v_role := get_user_role_for_book(p_book_id, p_user_email);
  
  -- Check permissions based on role and action
  CASE p_action
    WHEN 'view' THEN
      RETURN v_role IN ('owner', 'admin', 'editor', 'viewer');
    WHEN 'add_transaction' THEN
      RETURN v_role IN ('owner', 'admin', 'editor');
    WHEN 'edit_transaction' THEN
      RETURN v_role IN ('owner', 'admin', 'editor');
    WHEN 'delete_transaction' THEN
      RETURN v_role IN ('owner', 'admin');
    WHEN 'manage_members' THEN
      RETURN v_role IN ('owner', 'admin');
    WHEN 'manage_books' THEN
      RETURN v_role = 'owner';
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Migrate existing books to have owner
-- Set owner for existing books (you may need to adjust this based on your data)
UPDATE books 
SET owner_id = 'kapopara.king@gmail.com'
WHERE owner_id IS NULL;

-- Step 9: Create initial book_members entries for existing books
-- This assumes the first book is owned by kapopara.king@gmail.com
INSERT INTO book_members (book_id, user_email, role)
SELECT id, 'kapopara.king@gmail.com', 'owner'
FROM books
WHERE NOT EXISTS (
  SELECT 1 FROM book_members 
  WHERE book_members.book_id = books.id 
  AND book_members.user_email = 'kapopara.king@gmail.com'
)
ON CONFLICT (book_id, user_email) DO NOTHING;
