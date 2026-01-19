-- Migration: Add party support to transactions
-- Create parties table and add party column to transactions

-- Step 1: Create parties table
CREATE TABLE IF NOT EXISTS parties (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add party column to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS party TEXT;

-- Step 3: Enable Row Level Security for parties
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;

-- Step 4: Create policies for parties (allow public read, insert)
CREATE POLICY "Allow public read access" ON parties
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON parties
  FOR INSERT WITH CHECK (true);

-- Verification: Check if party column was added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name = 'party';
