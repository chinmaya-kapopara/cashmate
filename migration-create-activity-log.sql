-- Migration: Create activity log table to track all user activities
-- This table stores all actions performed by users in the system

-- Step 1: Create activity_log table
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
  metadata JSONB, -- Store additional details like transaction ID, member email, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_log_book_id ON activity_log(book_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_email ON activity_log(user_email);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_activity_type ON activity_log(activity_type);

-- Step 3: Enable Row Level Security
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Step 4: Create policies for activity_log
-- Users can view activities for books they have access to
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

-- Only allow inserts (activities are created by the system, not directly by users)
-- We'll use a function to insert activities
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

-- Step 5: Create function to log activity (for use in triggers or application code)
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

-- Step 6: Enable realtime for activity_log table
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;
