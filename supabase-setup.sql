-- ============================================================================
-- Family Expense Manager - Complete Database Setup for Supabase
-- ============================================================================
-- This is a single SQL file to set up the entire database schema for the
-- Family Expense Manager application.
-- 
-- Instructions:
-- 1. Open your Supabase project dashboard
-- 2. Go to SQL Editor
-- 3. Create a new query
-- 4. Copy and paste this entire file
-- 5. Run the query
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE TABLES
-- ============================================================================

-- Create books table
CREATE TABLE IF NOT EXISTS books (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create book_members table (manages user access to books with roles)
CREATE TABLE IF NOT EXISTS book_members (
  id BIGSERIAL PRIMARY KEY,
  book_id BIGINT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(book_id, user_email)
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  amount DECIMAL(20, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  added_by TEXT NOT NULL,
  party TEXT,
  timestamp BIGINT NOT NULL,
  book_id BIGINT REFERENCES books(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create parties table (book-specific parties)
CREATE TABLE IF NOT EXISTS parties (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  book_id BIGINT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT parties_book_id_name_unique UNIQUE (book_id, name)
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transaction_history table
CREATE TABLE IF NOT EXISTS transaction_history (
  id BIGSERIAL PRIMARY KEY,
  transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  changed_by TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated')),
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activity_log table
CREATE TABLE IF NOT EXISTS activity_log (
  id BIGSERIAL PRIMARY KEY,
  book_id BIGINT REFERENCES books(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'transaction_created',
    'transaction_updated',
    'transaction_deleted',
    'member_added',
    'member_removed',
    'member_role_changed',
    'party_added',
    'party_renamed',
    'party_deleted',
    'book_created',
    'book_renamed',
    'book_deleted'
  )),
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_book_members_book_id ON book_members(book_id);
CREATE INDEX IF NOT EXISTS idx_book_members_user_email ON book_members(user_email);
CREATE INDEX IF NOT EXISTS idx_transactions_book_id ON transactions(book_id);
CREATE INDEX IF NOT EXISTS idx_parties_book_id ON parties(book_id);
CREATE INDEX IF NOT EXISTS idx_transaction_history_transaction_id ON transaction_history(transaction_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_book_id ON activity_log(book_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_email ON activity_log(user_email);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_activity_type ON activity_log(activity_type);

-- ============================================================================
-- STEP 3: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get user name from auth.users metadata
CREATE OR REPLACE FUNCTION get_user_name(p_user_email TEXT)
RETURNS TEXT AS $$
DECLARE
  v_name TEXT;
BEGIN
  -- Get name from auth.users raw_user_meta_data
  SELECT raw_user_meta_data->>'name' INTO v_name
  FROM auth.users
  WHERE email = p_user_email;
  
  -- Return name or fallback to email username
  RETURN COALESCE(v_name, split_part(p_user_email, '@', 1));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user email from JWT or auth.users
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

-- Function to check if user has access to a book
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

-- Function to get user role for a book (for use in policies)
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

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
  p_book_id BIGINT,
  p_user_email TEXT,
  p_user_name TEXT,
  p_activity_type TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO activity_log (
    book_id,
    user_email,
    user_name,
    activity_type,
    description,
    metadata
  ) VALUES (
    p_book_id,
    p_user_email,
    p_user_name,
    p_activity_type,
    p_description,
    p_metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_name(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_name(TEXT) TO anon;

-- ============================================================================
-- STEP 4: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: CREATE ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- ===== BOOKS TABLE POLICIES =====

-- View: Users can view books they have access to
CREATE POLICY "books_select_policy" ON books
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM book_members
      WHERE book_members.book_id = books.id
      AND book_members.user_email = get_current_user_email()
    )
    OR
    -- Allow if book was just created (within last 2 minutes) and user is authenticated
    -- This handles the case where a book is just created and book_members entry doesn't exist yet
    (auth.uid() IS NOT NULL AND created_at > NOW() - INTERVAL '2 minutes')
  );

-- Insert: Any authenticated user can create books
CREATE POLICY "books_insert_policy" ON books
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

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

-- ===== BOOK_MEMBERS TABLE POLICIES =====

-- View: Users can view members of books they have access to
CREATE POLICY "book_members_select_policy" ON book_members
  FOR SELECT
  USING (
    user_has_book_access(book_id)
  );

-- Insert: Owners/admins can add members, or users can add themselves as owner for newly created books
CREATE POLICY "book_members_insert_policy" ON book_members
  FOR INSERT
  WITH CHECK (
    -- Allow if user is owner or admin for this book
    get_user_role_for_book_policy(book_id) IN ('owner', 'admin')
    OR
    -- Allow if user is adding themselves as owner and the book was just created
    -- This handles the case where a book is created and the creator needs to be added as owner
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

-- Update: Only owners can update member roles (cannot change own role)
CREATE POLICY "book_members_update_policy" ON book_members
  FOR UPDATE
  USING (
    get_user_role_for_book_policy(book_id) = 'owner' AND
    user_email != get_current_user_email()
  )
  WITH CHECK (
    get_user_role_for_book_policy(book_id) = 'owner' AND
    user_email != get_current_user_email()
  );

-- Delete: Only owners can remove members (cannot remove self)
CREATE POLICY "book_members_delete_policy" ON book_members
  FOR DELETE
  USING (
    get_user_role_for_book_policy(book_id) = 'owner' AND
    user_email != get_current_user_email()
  );

-- ===== TRANSACTIONS TABLE POLICIES =====

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

-- ===== PARTIES TABLE POLICIES =====

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

-- ===== USER_PROFILES TABLE POLICIES =====

-- View: Allow public read access
CREATE POLICY "user_profiles_select_policy" ON user_profiles
  FOR SELECT USING (true);

-- Insert: Allow public insert access
CREATE POLICY "user_profiles_insert_policy" ON user_profiles
  FOR INSERT WITH CHECK (true);

-- Update: Allow public update access
CREATE POLICY "user_profiles_update_policy" ON user_profiles
  FOR UPDATE USING (true);

-- ===== TRANSACTION_HISTORY TABLE POLICIES =====

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

-- Insert: Only owner, admin, editor can insert history
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

-- ===== ACTIVITY_LOG TABLE POLICIES =====

-- View: Users can view activities for books they have access to
CREATE POLICY "activity_log_select_policy" ON activity_log
  FOR SELECT
  USING (
    book_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM book_members
      WHERE book_members.book_id = activity_log.book_id
      AND book_members.user_email = get_current_user_email()
    )
  );

-- Insert: Allow inserts for users who are members of the book
CREATE POLICY "activity_log_insert_policy" ON activity_log
  FOR INSERT
  WITH CHECK (
    book_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM book_members
      WHERE book_members.book_id = activity_log.book_id
      AND book_members.user_email = activity_log.user_email
    )
  );

-- ============================================================================
-- STEP 6: ENABLE REALTIME FOR TABLES
-- ============================================================================

-- Enable realtime for transactions table
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

-- Enable realtime for book_members table
ALTER PUBLICATION supabase_realtime ADD TABLE book_members;

-- Enable realtime for activity_log table
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- Your database is now set up with:
-- - All required tables
-- - Row Level Security (RLS) enabled
-- - Role-based access control policies
-- - Realtime subscriptions enabled
-- - Performance indexes
-- - Helper functions
--
-- You can now start using the Family Expense Manager application!
-- ============================================================================
