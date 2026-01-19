-- Migration: Remove family_members table
-- This table is no longer needed as we now use book_members for role-based access control
-- and user_profiles for user information

-- Drop the family_members table if it exists
DROP TABLE IF EXISTS family_members CASCADE;
