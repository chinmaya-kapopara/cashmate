-- Migration: Fix book_members INSERT policy to allow adding creator as owner
-- The issue is that when creating a book, we need to add the creator as owner,
-- but the policy checks if the user has owner/admin role for that book,
-- which doesn't exist yet since the book was just created.

-- Drop the existing policy
DROP POLICY IF EXISTS "book_members_insert_policy" ON book_members;

-- Create a new policy that allows:
-- 1. Owners/admins to add members to existing books
-- 2. Users to add themselves as owner when the book was just created (within 2 minutes)
-- This is needed because when a book is first created, the creator isn't in book_members yet
CREATE POLICY "book_members_insert_policy" ON book_members
  FOR INSERT
  WITH CHECK (
    -- Allow if user is owner or admin for this book
    get_user_role_for_book_policy(book_id) IN ('owner', 'admin')
    OR
    -- Allow if user is adding themselves as owner and the book was just created
    -- This handles the case where a book is created and the creator needs to be added as owner
    -- We check if the book was created within the last 2 minutes to allow the initial owner assignment
    (
      user_email = get_current_user_email() 
      AND role = 'owner' 
      AND auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM books
        WHERE books.id = book_members.book_id
        AND books.created_at > NOW() - INTERVAL '2 minutes'
      )
    )
  );
