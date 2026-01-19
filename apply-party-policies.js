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

async function applyMigration() {
  console.log('Applying UPDATE and DELETE policies for parties table...');
  
  // Check if policies already exist
  const { data: existingPolicies, error: checkError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT policyname 
      FROM pg_policies 
      WHERE tablename = 'parties' 
      AND policyname IN ('Allow public update access', 'Allow public delete access');
    `
  }).catch(() => ({ data: null, error: null }));

  // Apply UPDATE policy
  const updatePolicySQL = `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'parties' 
        AND policyname = 'Allow public update access'
      ) THEN
        CREATE POLICY "Allow public update access" ON parties
          FOR UPDATE USING (true);
      END IF;
    END $$;
  `;

  // Apply DELETE policy
  const deletePolicySQL = `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'parties' 
        AND policyname = 'Allow public delete access'
      ) THEN
        CREATE POLICY "Allow public delete access" ON parties
          FOR DELETE USING (true);
      END IF;
    END $$;
  `;

  try {
    // Use REST API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({ sql: updatePolicySQL + deletePolicySQL })
    });

    if (!response.ok) {
      // Try direct SQL execution via Supabase client
      const { error: updateError } = await supabase
        .from('parties')
        .select('*')
        .limit(0); // This won't work for DDL, but let's try a different approach
      
      console.log('Note: Direct SQL execution may require Supabase dashboard.');
      console.log('Please run the following SQL in your Supabase SQL Editor:');
      console.log('\n' + updatePolicySQL + '\n' + deletePolicySQL);
    } else {
      console.log('✅ Policies applied successfully!');
    }
  } catch (error) {
    console.log('⚠️  Could not apply via script. Please run the SQL manually in Supabase dashboard.');
    console.log('\nSQL to execute:');
    console.log('\n' + updatePolicySQL + '\n' + deletePolicySQL);
  }
}

applyMigration();
