-- Migration: Enable Realtime for transactions table
-- This allows real-time subscriptions to changes in the transactions table

-- Enable realtime for transactions table
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

-- Verify realtime is enabled (optional check)
-- You can run this query to verify:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'transactions';
