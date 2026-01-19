# Roles Backend Setup Guide

## Overview
This guide explains how to set up the role-based access control (RBAC) system for the Family Expense Manager app.

## Database Migration

### Step 1: Run the Migration
Execute the SQL migration file `migration-add-book-members-roles.sql` in your Supabase SQL Editor:

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `migration-add-book-members-roles.sql`
3. Click "Run" to execute

This migration will:
- Add `owner_id` column to `books` table
- Create `book_members` table to store user access and roles
- Create helper functions for role checking
- Set up RLS policies

## Database Schema

### book_members Table
- `id`: Primary key
- `book_id`: Foreign key to books table
- `user_email`: User's email address
- `role`: One of 'owner', 'admin', 'editor', 'viewer'
- `created_at`: Timestamp
- `updated_at`: Timestamp
- Unique constraint on (book_id, user_email)

## Role Permissions

### Owner
- ✓ View transactions
- ✓ Add transactions
- ✓ Edit transactions
- ✓ Delete transactions
- ✓ Manage members
- ✓ Manage books

### Admin
- ✓ View transactions
- ✓ Add transactions
- ✓ Edit transactions
- ✓ Delete transactions
- ✓ Manage members
- ✗ Manage books

### Editor
- ✓ View transactions
- ✓ Add transactions
- ✓ Edit transactions
- ✗ Delete transactions
- ✗ Manage members
- ✗ Manage books

### Viewer
- ✓ View transactions
- ✗ Add transactions
- ✗ Edit transactions
- ✗ Delete transactions
- ✗ Manage members
- ✗ Manage books

## Backend Functions

The following functions are implemented in `app/page.tsx`:

1. **fetchBookMembers()**: Fetches all members for the current book
2. **addBookMember(email, role)**: Adds a new member to the book
3. **updateMemberRole(email, role)**: Updates a member's role
4. **removeBookMember(email)**: Removes a member from the book
5. **getUserRole()**: Gets the current user's role for the selected book

## Usage

### Adding a Member
1. Open the Members modal
2. Click "Add Member"
3. Enter email address
4. Select role
5. Click "Add Member"

### Editing a Role
1. Open the Members modal
2. Click the three-dot menu next to a member
3. Click "Edit Role"
4. Select new role
5. Click "Update Role"

### Removing a Member
1. Open the Members modal
2. Click the three-dot menu next to a member
3. Click "Remove"
4. Confirm deletion

## Next Steps

To fully implement role-based permissions, you should:

1. Add permission checks before allowing actions:
   - Check `getUserRole()` before allowing add/edit/delete transactions
   - Check role before allowing member management
   - Check role before allowing book management

2. Update UI to hide/disable features based on role:
   - Hide "Add Transaction" button for viewers
   - Disable edit/delete buttons for viewers/editors
   - Hide member management for non-admin/owner users

3. Add server-side validation in Supabase:
   - Create RLS policies that enforce role-based access
   - Add database triggers to validate permissions

## Testing

After setup:
1. Create a test user account
2. Add the user to a book with a specific role
3. Log in as that user
4. Verify that permissions match the assigned role
