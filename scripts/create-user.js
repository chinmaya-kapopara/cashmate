const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createUser() {
  console.log('Creating user with email: kapopara.king@gmail.com');
  
  try {
    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return;
    }

    const userExists = existingUsers.users.find(u => u.email === 'kapopara.king@gmail.com');
    
    if (userExists) {
      console.log('User already exists. Updating password and metadata...');
      const { data, error } = await supabase.auth.admin.updateUserById(
        userExists.id,
        { 
          password: 'Test1234',
          user_metadata: {
            ...userExists.user_metadata,
            name: 'Chinmaya Kapopara'
          }
        }
      );
      
      if (error) {
        console.error('Error updating user:', error);
      } else {
        console.log('✅ Password and metadata updated successfully!');
        console.log('Email: kapopara.king@gmail.com');
        console.log('Password: Test1234');
        console.log('✅ Name set in user_metadata: Chinmaya Kapopara');
      }
      return;
    }

    // Create new user with name in user_metadata
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'kapopara.king@gmail.com',
      password: 'Test1234',
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: 'Chinmaya Kapopara'
      }
    });

    if (error) {
      console.error('Error creating user:', error);
    } else {
      console.log('✅ User created successfully!');
      console.log('Email: kapopara.king@gmail.com');
      console.log('Password: Test1234');
      console.log('User ID:', data.user.id);
      console.log('✅ Name set in user_metadata: Chinmaya Kapopara');
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createUser();
