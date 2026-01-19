-- Migration: Add UPDATE and DELETE policies for parties table
-- This allows renaming and deleting parties

-- Create policy for UPDATE operations on parties
CREATE POLICY "Allow public update access" ON parties
  FOR UPDATE USING (true);

-- Create policy for DELETE operations on parties
CREATE POLICY "Allow public delete access" ON parties
  FOR DELETE USING (true);
