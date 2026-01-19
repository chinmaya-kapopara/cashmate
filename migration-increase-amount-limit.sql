-- Migration: Increase amount column size to support larger values
-- Change from DECIMAL(10, 2) to DECIMAL(20, 2) to support up to 999,999,999,999,999,999.99

-- Step 1: Alter the amount column to support larger values
ALTER TABLE transactions 
ALTER COLUMN amount TYPE DECIMAL(20, 2);

-- Verification: Check the column type
SELECT 
    column_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name = 'amount';
