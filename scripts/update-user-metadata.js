// Script to update user metadata for existing users
// This sets the name 'Chinmaya Kapopara' for kapopara.king@gmail.com

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // You'll need to add this to .env.local

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please add SUPABASE_SERVICE_ROLE_KEY to .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function updateUserMetadata() {
  try {
    const email = 'kapopara.king@gmail.com';
    const name = 'Chinmaya Kapopara';

    // Get user by email
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers();
    
    if (fetchError) {
      throw fetchError;
    }

    const user = users.users.find(u => u.email === email);

    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    // Update user metadata
    const { data, error } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          name: name
        }
      }
    );

    if (error) {
      throw error;
    }

    console.log(`Successfully updated user metadata for ${email}`);
    console.log('Updated user:', data.user.email);
    console.log('Name:', data.user.user_metadata?.name);
  } catch (error) {
    console.error('Error updating user metadata:', error);
    process.exit(1);
  }
}

updateUserMetadata();
