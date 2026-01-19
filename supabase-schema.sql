-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  amount DECIMAL(20, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  added_by TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  book_id BIGINT REFERENCES books(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create books table
CREATE TABLE IF NOT EXISTS books (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create family_members table
CREATE TABLE IF NOT EXISTS family_members (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial family members
INSERT INTO family_members (name) VALUES
  ('Chinmay Kapopara'),
  ('Ramesh Kapopara'),
  ('Jyoti Kapopara')
ON CONFLICT (name) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions (allow public read and insert)
CREATE POLICY "Allow public read access" ON transactions
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON transactions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON transactions
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access" ON transactions
  FOR DELETE USING (true);

-- Create policies for books (allow public read, insert, update, delete)
CREATE POLICY "Allow public read access" ON books
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON books
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON books
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access" ON books
  FOR DELETE USING (true);

-- Create policies for family_members (allow public read)
CREATE POLICY "Allow public read access" ON family_members
  FOR SELECT USING (true);

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

-- Enable Row Level Security for transaction_history
ALTER TABLE transaction_history ENABLE ROW LEVEL SECURITY;

-- Create policies for transaction_history (allow public read and insert)
CREATE POLICY "Allow public read access" ON transaction_history
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON transaction_history
  FOR INSERT WITH CHECK (true);

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

-- Enable Row Level Security for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles (allow public read, insert, update)
CREATE POLICY "Allow public read access" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON user_profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON user_profiles
  FOR UPDATE USING (true);
