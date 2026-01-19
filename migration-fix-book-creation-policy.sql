-- Migration: Fix book creation policy to allow any authenticated user
-- The issue is that get_current_user_email() might return NULL in some cases
-- We should check for authentication (auth.uid()) instead, which is more reliable

-- Drop the existing policy
DROP POLICY IF EXISTS "books_insert_policy" ON books;

-- Create a more robust policy that checks for authentication
-- Any user with a valid auth.uid() can create books
-- This is more reliable than checking get_current_user_email() which depends on JWT claims
CREATE POLICY "books_insert_policy" ON books
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
