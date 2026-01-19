-- Migration: Remove description column from books table
-- This column is not being used in the application

-- Step 1: Drop the description column from books table
ALTER TABLE books 
DROP COLUMN IF EXISTS description;
