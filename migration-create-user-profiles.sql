-- Migration: Create user_profiles table
-- This table stores user profile information (name and email)

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default profile for Chinmay Kapopara
INSERT INTO user_profiles (name, email) VALUES
  ('Chinmay Kapopara', 'kapopara.king@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles (allow public read, insert, update)
CREATE POLICY "Allow public read access" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON user_profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON user_profiles
  FOR UPDATE USING (true);
