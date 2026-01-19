# Authentication Setup

## Overview
The app now includes a complete authentication flow with:
- Login (Sign In)
- Sign Up (Create Account)
- Forgot Password (Reset Password)

## Setup Instructions

### 1. Create User in Supabase

Run the script to create the user with the provided credentials:

```bash
node scripts/create-user.js
```

This will create a user with:
- **Email**: kapopara.king@gmail.com
- **Password**: Test1234

**Note**: Make sure you have `SUPABASE_SERVICE_ROLE_KEY` in your `.env.local` file for the script to work.

### 2. Manual User Creation (Alternative)

If the script doesn't work, you can create the user manually:

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** > **Users**
3. Click **Add User** > **Create New User**
4. Enter:
   - Email: `kapopara.king@gmail.com`
   - Password: `Test1234`
   - Auto Confirm User: ✅ (checked)

### 3. Test the Authentication Flow

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000`
   - You should be redirected to `/auth` if not logged in

3. Login with:
   - Email: `kapopara.king@gmail.com`
   - Password: `Test1234`

## Features

### Login Page (`/auth`)
- Email and password login
- Link to sign up
- Link to forgot password

### Sign Up
- Create new account with email and password
- Password confirmation
- Minimum 6 characters password requirement
- Email verification (if enabled in Supabase)

### Forgot Password
- Enter email to receive password reset link
- Reset link sent to email
- Redirects to reset page when link is clicked

## Protected Routes

The main app (`/`) is now protected:
- Users must be authenticated to access
- Unauthenticated users are redirected to `/auth`
- Session is checked on page load and on auth state changes

## User Profile Integration

The authenticated user's email is automatically used in:
- Profile page email field (read-only)
- User profile data fetching
- Profile updates

## Environment Variables Required

Make sure your `.env.local` includes:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (for user creation script)
```

## Troubleshooting

### User not found
- Make sure the user exists in Supabase Auth
- Check that email confirmation is enabled or user is auto-confirmed

### Redirect loop
- Clear browser cookies/localStorage
- Check Supabase RLS policies allow authenticated users

### Password reset not working
- Check Supabase email settings
- Verify redirect URL is configured in Supabase dashboard
