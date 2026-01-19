-- Migration: Enforce Role-Based Row Level Security Policies
-- This migration replaces permissive policies with proper role-based access control
-- Run this after migration-add-book-members-roles.sql

-- Step 1: Drop existing permissive policies
DROP POLICY IF EXISTS "Allow public read access" ON transactions;
DROP POLICY IF EXISTS "Allow public insert access" ON transactions;
DROP POLICY IF EXISTS "Allow public update access" ON transactions;
DROP POLICY IF EXISTS "Allow public delete access" ON transactions;

DROP POLICY IF EXISTS "Allow public read access" ON books;
DROP POLICY IF EXISTS "Allow public insert access" ON books;
DROP POLICY IF EXISTS "Allow public update access" ON books;
DROP POLICY IF EXISTS "Allow public delete access" ON books;

DROP POLICY IF EXISTS "Allow read access to book members" ON book_members;
DROP POLICY IF EXISTS "Allow insert for owners and admins" ON book_members;
DROP POLICY IF EXISTS "Allow update for owners and admins" ON book_members;
DROP POLICY IF EXISTS "Allow delete for owners and admins" ON book_members;

DROP POLICY IF EXISTS "Allow public read access" ON parties;
DROP POLICY IF EXISTS "Allow public insert access" ON parties;

DROP POLICY IF EXISTS "Allow public read access" ON transaction_history;
DROP POLICY IF EXISTS "Allow public insert access" ON transaction_history;

-- Step 2: Create helper function to get current user email
-- First try from JWT, then fallback to auth.users table
CREATE OR REPLACE FUNCTION get_current_user_email()
RETURNS TEXT AS $$
DECLARE
  v_email TEXT;
  v_uid UUID;
BEGIN
  -- Try to get email from JWT first
  v_email := (auth.jwt() ->> 'email')::TEXT;
  
  -- If not in JWT, get from auth.users using auth.uid()
  IF v_email IS NULL THEN
    v_uid := auth.uid();
    IF v_uid IS NOT NULL THEN
      SELECT email INTO v_email
      FROM auth.users
      WHERE id = v_uid;
    END IF;
  END IF;
  
  RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 3: Create helper function to check if user has access to book
CREATE OR REPLACE FUNCTION user_has_book_access(p_book_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_email TEXT;
  v_role TEXT;
BEGIN
  v_user_email := get_current_user_email();
  IF v_user_email IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT role INTO v_role
  FROM book_members
  WHERE book_id = p_book_id AND user_email = v_user_email;
  
  RETURN v_role IN ('owner', 'admin', 'editor', 'viewer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 4: Create helper function to get user role for a book (for use in policies)
CREATE OR REPLACE FUNCTION get_user_role_for_book_policy(p_book_id BIGINT)
RETURNS TEXT AS $$
DECLARE
  v_user_email TEXT;
  v_role TEXT;
BEGIN
  v_user_email := get_current_user_email();
  IF v_user_email IS NULL THEN
    RETURN 'none';
  END IF;
  
  SELECT role INTO v_role
  FROM book_members
  WHERE book_id = p_book_id AND user_email = v_user_email;
  
  RETURN COALESCE(v_role, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 5: TRANSACTIONS TABLE POLICIES

-- View: All users with access to the book can view transactions
CREATE POLICY "transactions_select_policy" ON transactions
  FOR SELECT
  USING (
    book_id IS NOT NULL AND 
    user_has_book_access(book_id)
  );

-- Insert: Only owner, admin, editor can insert transactions
CREATE POLICY "transactions_insert_policy" ON transactions
  FOR INSERT
  WITH CHECK (
    book_id IS NOT NULL AND
    get_user_role_for_book_policy(book_id) IN ('owner', 'admin', 'editor')
  );

-- Update: Only owner, admin, editor can update transactions
CREATE POLICY "transactions_update_policy" ON transactions
  FOR UPDATE
  USING (
    book_id IS NOT NULL AND
    get_user_role_for_book_policy(book_id) IN ('owner', 'admin', 'editor')
  )
  WITH CHECK (
    book_id IS NOT NULL AND
    get_user_role_for_book_policy(book_id) IN ('owner', 'admin', 'editor')
  );

-- Delete: Only owner, admin can delete transactions
CREATE POLICY "transactions_delete_policy" ON transactions
  FOR DELETE
  USING (
    book_id IS NOT NULL AND
    get_user_role_for_book_policy(book_id) IN ('owner', 'admin')
  );

-- Step 6: BOOKS TABLE POLICIES

-- View: Users can view books they have access to
CREATE POLICY "books_select_policy" ON books
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM book_members
      WHERE book_members.book_id = books.id
      AND book_members.user_email = get_current_user_email()
    )
  );

-- Insert: Anyone authenticated can create books (they become owner)
CREATE POLICY "books_insert_policy" ON books
  FOR INSERT
  WITH CHECK (get_current_user_email() IS NOT NULL);

-- Update: Only owners can update books
CREATE POLICY "books_update_policy" ON books
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM book_members
      WHERE book_members.book_id = books.id
      AND book_members.user_email = get_current_user_email()
      AND book_members.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM book_members
      WHERE book_members.book_id = books.id
      AND book_members.user_email = get_current_user_email()
      AND book_members.role = 'owner'
    )
  );

-- Delete: Only owners can delete books
CREATE POLICY "books_delete_policy" ON books
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM book_members
      WHERE book_members.book_id = books.id
      AND book_members.user_email = get_current_user_email()
      AND book_members.role = 'owner'
    )
  );

-- Step 7: BOOK_MEMBERS TABLE POLICIES

-- View: Users can view members of books they have access to
CREATE POLICY "book_members_select_policy" ON book_members
  FOR SELECT
  USING (
    user_has_book_access(book_id)
  );

-- Insert: Only owners and admins can add members
CREATE POLICY "book_members_insert_policy" ON book_members
  FOR INSERT
  WITH CHECK (
    get_user_role_for_book_policy(book_id) IN ('owner', 'admin')
  );

-- Update: Only owners can update member roles
-- Note: Cannot change own role and cannot change last owner's role are enforced at application level
-- RLS policies cannot access OLD/NEW values, so we rely on application-level validation
CREATE POLICY "book_members_update_policy" ON book_members
  FOR UPDATE
  USING (
    get_user_role_for_book_policy(book_id) = 'owner' AND
    user_email != get_current_user_email() -- Cannot change own role
  )
  WITH CHECK (
    get_user_role_for_book_policy(book_id) = 'owner' AND
    user_email != get_current_user_email()
  );

-- Delete: Only owners can remove members
-- Note: Cannot remove self and cannot remove last owner are enforced at application level
CREATE POLICY "book_members_delete_policy" ON book_members
  FOR DELETE
  USING (
    get_user_role_for_book_policy(book_id) = 'owner' AND
    user_email != get_current_user_email() -- Cannot remove self
  );

-- Step 8: PARTIES TABLE POLICIES

-- View: Users can view parties in books they have access to
CREATE POLICY "parties_select_policy" ON parties
  FOR SELECT
  USING (
    book_id IS NOT NULL AND
    user_has_book_access(book_id)
  );

-- Insert: Only owner, admin, editor can add parties
CREATE POLICY "parties_insert_policy" ON parties
  FOR INSERT
  WITH CHECK (
    book_id IS NOT NULL AND
    get_user_role_for_book_policy(book_id) IN ('owner', 'admin', 'editor')
  );

-- Update: Only owner, admin, editor can update parties
CREATE POLICY "parties_update_policy" ON parties
  FOR UPDATE
  USING (
    book_id IS NOT NULL AND
    get_user_role_for_book_policy(book_id) IN ('owner', 'admin', 'editor')
  )
  WITH CHECK (
    book_id IS NOT NULL AND
    get_user_role_for_book_policy(book_id) IN ('owner', 'admin', 'editor')
  );

-- Delete: Only owner, admin can delete parties
CREATE POLICY "parties_delete_policy" ON parties
  FOR DELETE
  USING (
    book_id IS NOT NULL AND
    get_user_role_for_book_policy(book_id) IN ('owner', 'admin')
  );

-- Step 9: TRANSACTION_HISTORY TABLE POLICIES

-- View: Users can view history for transactions in books they have access to
CREATE POLICY "transaction_history_select_policy" ON transaction_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_history.transaction_id
      AND transactions.book_id IS NOT NULL
      AND user_has_book_access(transactions.book_id)
    )
  );

-- Insert: Only owner, admin, editor can insert history (when they modify transactions)
CREATE POLICY "transaction_history_insert_policy" ON transaction_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_history.transaction_id
      AND transactions.book_id IS NOT NULL
      AND get_user_role_for_book_policy(transactions.book_id) IN ('owner', 'admin', 'editor')
    )
  );

-- Step 10: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_book_id ON transactions(book_id);
CREATE INDEX IF NOT EXISTS idx_parties_book_id ON parties(book_id);
CREATE INDEX IF NOT EXISTS idx_transaction_history_transaction_id ON transaction_history(transaction_id);

-- Verification queries (run these to verify policies are working)
-- SELECT * FROM transactions WHERE book_id = 1; -- Should only show if user has access
-- SELECT * FROM books; -- Should only show books user has access to
-- SELECT * FROM book_members WHERE book_id = 1; -- Should only show if user has access to book
-- SELECT * FROM parties WHERE book_id = 1; -- Should only show if user has access to book
