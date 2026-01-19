-- Migration: Enable Realtime for book_members table
-- This allows real-time subscriptions to changes in the book_members table

-- Enable realtime for book_members table
ALTER PUBLICATION supabase_realtime ADD TABLE book_members;

-- Verify realtime is enabled (optional check)
-- You can run this query to verify:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'book_members';
