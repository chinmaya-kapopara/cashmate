-- Migration: Remove category and icon columns from transactions table
-- and clean up transaction_history JSONB fields

-- Step 1: Drop category column from transactions table if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'category'
    ) THEN
        ALTER TABLE transactions DROP COLUMN category;
        RAISE NOTICE 'Dropped category column from transactions table';
    ELSE
        RAISE NOTICE 'category column does not exist in transactions table';
    END IF;
END $$;

-- Step 2: Drop icon column from transactions table if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'icon'
    ) THEN
        ALTER TABLE transactions DROP COLUMN icon;
        RAISE NOTICE 'Dropped icon column from transactions table';
    ELSE
        RAISE NOTICE 'icon column does not exist in transactions table';
    END IF;
END $$;

-- Step 3: Remove category and icon from old_values in transaction_history
UPDATE transaction_history
SET old_values = old_values - 'category' - 'icon'
WHERE old_values IS NOT NULL 
  AND (old_values ? 'category' OR old_values ? 'icon');

-- Step 4: Remove category and icon from new_values in transaction_history
UPDATE transaction_history
SET new_values = new_values - 'category' - 'icon'
WHERE new_values IS NOT NULL 
  AND (new_values ? 'category' OR new_values ? 'icon');

-- Verification: Check if columns were successfully removed
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;
