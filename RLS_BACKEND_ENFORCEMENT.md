# Row Level Security (RLS) Backend Enforcement

## Overview
This document describes the backend-level role-based access control (RBAC) enforcement using Supabase Row Level Security (RLS) policies.

## Migration File
Run `migration-enforce-role-based-rls.sql` in your Supabase SQL Editor to enforce all role-based permissions at the database level.

## Security Model

### Helper Functions

1. **`get_current_user_email()`**: Extracts the current user's email from the JWT token
2. **`user_has_book_access(p_book_id)`**: Checks if the current user has any access to a book
3. **`get_user_role_for_book_policy(p_book_id)`**: Gets the current user's role for a specific book

### Table Policies

#### 1. TRANSACTIONS Table

- **SELECT**: All users with access to the book can view transactions
- **INSERT**: Only `owner`, `admin`, `editor` can add transactions
- **UPDATE**: Only `owner`, `admin`, `editor` can update transactions
- **DELETE**: Only `owner`, `admin` can delete transactions

#### 2. BOOKS Table

- **SELECT**: Users can only view books they have access to (via `book_members`)
- **INSERT**: Any authenticated user can create books (they become owner)
- **UPDATE**: Only `owner` can update books
- **DELETE**: Only `owner` can delete books

#### 3. BOOK_MEMBERS Table

- **SELECT**: Users can view members of books they have access to
- **INSERT**: Only `owner`, `admin` can add members
- **UPDATE**: Only `owner` can update member roles (cannot change own role)
- **DELETE**: Only `owner` can remove members (cannot remove self)

**Note**: The following constraints are enforced at the application level (not in RLS):
- Cannot change own role
- Cannot change last owner's role to non-owner
- Cannot remove last owner

These require checking the current state before the operation, which is better handled in application code.

#### 4. PARTIES Table

- **SELECT**: Users can view parties in books they have access to
- **INSERT**: Only `owner`, `admin`, `editor` can add parties
- **UPDATE**: Only `owner`, `admin`, `editor` can update parties
- **DELETE**: Only `owner`, `admin`, `editor` can delete parties

#### 5. TRANSACTION_HISTORY Table

- **SELECT**: Users can view history for transactions in books they have access to
- **INSERT**: Only `owner`, `admin`, `editor` can insert history (when modifying transactions)

## Role Permissions Summary

| Action | Owner | Admin | Editor | Viewer |
|--------|-------|-------|--------|--------|
| **Transactions** |
| View | ✅ | ✅ | ✅ | ✅ |
| Add | ✅ | ✅ | ✅ | ❌ |
| Edit | ✅ | ✅ | ✅ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ |
| **Books** |
| View | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ✅ | ✅ |
| Update | ✅ | ❌ | ❌ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ |
| **Members** |
| View | ✅ | ✅ | ✅ | ✅ |
| Add | ✅ | ✅ | ❌ | ❌ |
| Edit Role | ✅ | ❌ | ❌ | ❌ |
| Remove | ✅ | ❌ | ❌ | ❌ |
| **Parties** |
| View | ✅ | ✅ | ✅ | ✅ |
| Add | ✅ | ✅ | ✅ | ❌ |
| Edit | ✅ | ✅ | ✅ | ❌ |
| Delete | ✅ | ✅ | ✅ | ❌ |

## Application-Level Validations

The following validations are enforced in the application code (`app/page.tsx`) because they require checking the current state:

1. **Cannot change own role**: Checked before calling `updateMemberRole()`
2. **Cannot change last owner's role**: Counts owners before allowing role change
3. **Cannot remove last owner**: Counts owners before allowing removal
4. **Cannot remove self**: Checked before calling `removeBookMember()`

## Testing

After applying the migration, test the following scenarios:

1. **Viewer Role**:
   - ✅ Can view transactions
   - ❌ Cannot add/edit/delete transactions
   - ❌ Cannot see bottom navigation bar
   - ❌ Cannot edit transaction cards

2. **Editor Role**:
   - ✅ Can view/add/edit transactions
   - ❌ Cannot delete transactions
   - ❌ Cannot manage members
   - ❌ Cannot manage books

3. **Admin Role**:
   - ✅ Can view/add/edit/delete transactions
   - ✅ Can manage members
   - ❌ Cannot manage books

4. **Owner Role**:
   - ✅ Full access to all features
   - ✅ Can manage books
   - ✅ Can manage members

## Important Notes

1. **JWT Token**: The policies rely on the user's email being available in the JWT token. Ensure Supabase auth is properly configured.

2. **Performance**: The policies use helper functions that query `book_members`. Indexes are created to optimize these queries.

3. **Application + Database**: Both application-level checks and RLS policies work together:
   - RLS provides defense-in-depth (prevents unauthorized database access)
   - Application checks provide better UX (hide UI elements, show clear error messages)

4. **Migration Order**: Run this migration AFTER `migration-add-book-members-roles.sql` to ensure all helper functions exist.
