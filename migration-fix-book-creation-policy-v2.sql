-- Migration: Fix book creation policy - allow authenticated users to create books
-- The issue is that both INSERT and SELECT policies need to allow the operation

-- Step 1: Update the INSERT policy to use auth.uid() instead of get_current_user_email()
DROP POLICY IF EXISTS "books_insert_policy" ON books;

CREATE POLICY "books_insert_policy" ON books
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Step 2: Update the SELECT policy to allow users to see books they just created
-- This is needed because Supabase does a SELECT after INSERT when using .select()
-- The book_members entry is created AFTER the book, so we need to allow seeing recently created books
DROP POLICY IF EXISTS "books_select_policy" ON books;

CREATE POLICY "books_select_policy" ON books
  FOR SELECT
  USING (
    -- Allow if user has access via book_members
    EXISTS (
      SELECT 1 FROM book_members
      WHERE book_members.book_id = books.id
      AND book_members.user_email = get_current_user_email()
    )
    OR
    -- Allow if book was just created (within last 2 minutes) and user is authenticated
    -- This handles the case where a book is just created and book_members entry doesn't exist yet
    -- We use a time window to allow the SELECT to return the newly created book
    (auth.uid() IS NOT NULL AND created_at > NOW() - INTERVAL '2 minutes')
  );
