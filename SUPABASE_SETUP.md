# Supabase Setup Instructions

## Step 1: Create Environment File

Create a `.env.local` file in the root directory with the following content:

```
NEXT_PUBLIC_SUPABASE_URL=https://yrdqqxqdhuiwtxepdbmi.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_kgMWH-zhRM5xhmjqKB_rhA_NrE4D8QN
```

## Step 2: Set Up Database Tables

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase-schema.sql` into the SQL editor
4. Click **Run** to execute the SQL

This will create:
- `transactions` table for storing all transactions
- `family_members` table for storing family member names
- Row Level Security (RLS) policies to allow public access

## Step 3: Verify Setup

1. Restart your Next.js development server:
   ```bash
   npm run dev
   ```

2. The app should now:
   - Load transactions from Supabase on page load
   - Save new transactions to Supabase when added
   - Load family members from Supabase

## Features Implemented

✅ **Data Persistence**: All transactions are saved to Supabase
✅ **Real-time Ready**: Database is set up for real-time subscriptions (can be added later)
✅ **Family Members**: Family members are loaded from database
✅ **Error Handling**: Falls back to local data if Supabase connection fails

## Database Schema

### Transactions Table
- `id`: Auto-incrementing primary key
- `name`: Transaction description
- `date`: Formatted date string
- `amount`: Decimal amount
- `type`: 'income' or 'expense'
- `added_by`: Name of person who added transaction
- `timestamp`: Unix timestamp for sorting
- `book_id`: Foreign key to books table
- `created_at`: Auto-generated timestamp

### Family Members Table
- `id`: Auto-incrementing primary key
- `name`: Family member name (unique)
- `created_at`: Auto-generated timestamp

## Troubleshooting

If transactions don't load:
1. Check that `.env.local` file exists and has correct values
2. Verify SQL schema was executed successfully in Supabase
3. Check browser console for any error messages
4. Verify RLS policies are enabled and allow public access
