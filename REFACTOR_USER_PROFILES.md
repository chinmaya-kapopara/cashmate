# Refactor: User Profiles to Auth Metadata

## Summary
Refactored the app to use `auth.users.user_metadata` instead of the separate `user_profiles` table. This simplifies the architecture by storing user names directly in the authentication metadata.

## Changes Made

### 1. Authentication Flow (`app/auth/page.tsx`)
- **Signup**: Now stores name in `user_metadata` during signup using `options.data.name`
- **Login**: Checks and updates `user_metadata` if name is missing (fallback to email username)

### 2. Main App (`app/page.tsx`)
- **fetchUserProfile()**: Now reads name from `user.user_metadata.name` instead of querying `user_profiles` table
- **getCurrentUserName()**: Updated to prioritize `user.user_metadata.name`
- **Profile Save**: Uses `supabase.auth.updateUser()` to update `user_metadata` instead of updating `user_profiles` table
- **fetchBookMembers()**: Uses database function `get_user_name()` to fetch names from `auth.users` metadata

### 3. Database Function (`migration-create-get-user-name-function.sql`)
- Created `get_user_name(p_user_email TEXT)` function
- Accesses `auth.users.raw_user_meta_data->>'name'` to get user names
- Returns email username as fallback if name not found
- Required because client-side code cannot directly query `auth.users` table

### 4. Scripts
- **scripts/create-user.js**: Updated to set `user_metadata.name` instead of creating `user_profiles` entry
- **scripts/update-user-metadata.js**: New script to update existing user's metadata (sets 'Chinmaya Kapopara' for kapopara.king@gmail.com)

## Migration Steps

### Step 1: Run Database Migration
Execute `migration-create-get-user-name-function.sql` in Supabase SQL Editor:
```sql
-- This creates the get_user_name() function
```

### Step 2: Update Existing User Metadata
Run the update script to set name for existing user:
```bash
node scripts/update-user-metadata.js
```

**Note**: You'll need to add `SUPABASE_SERVICE_ROLE_KEY` to your `.env.local` file. Get this from:
- Supabase Dashboard → Settings → API → `service_role` key (keep this secret!)

### Step 3: (Optional) Remove user_profiles Table
After verifying everything works, you can drop the `user_profiles` table:
```sql
DROP TABLE IF EXISTS user_profiles CASCADE;
```

## Benefits
1. **Simpler Architecture**: No need to maintain a separate table
2. **Automatic Sync**: Name is always in sync with auth user
3. **Less Queries**: No need to join tables for user names
4. **Standard Pattern**: Using Supabase's built-in metadata storage

## Important Notes
- The `get_user_name()` function is required because client-side code cannot directly access `auth.users` table
- User metadata is updated via `supabase.auth.updateUser()` which requires the user to be authenticated
- The name is stored in `user_metadata` (accessible via `user.user_metadata.name`)
- Fallback to email username if name is not set

## Testing Checklist
- [ ] Sign up new user - name should be saved in metadata
- [ ] Login existing user - should read name from metadata
- [ ] Update profile name - should update metadata
- [ ] View book members - should show names from metadata
- [ ] Run update script - should set name for kapopara.king@gmail.com
