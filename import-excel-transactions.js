import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to format date for database (YYYY-MM-DD)
function formatDateForDB(dateValue) {
  if (!dateValue) return null;
  
  // If it's already a string in YYYY-MM-DD format
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }
  
  // If it's an Excel date serial number
  if (typeof dateValue === 'number') {
    // Excel epoch is January 1, 1900
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
  }
  
  // If it's a Date object
  if (dateValue instanceof Date) {
    return dateValue.toISOString().split('T')[0];
  }
  
  // Try to parse as date string
  const date = new Date(dateValue);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  return null;
}

// Helper function to get timestamp
function getTimestamp() {
  return Date.now();
}

async function importTransactions() {
  try {
    console.log('Starting import process...');
    
    // Read Excel file
    const excelPath = join(__dirname, 'rich_dad_transactions_from_pdf.xlsx');
    console.log(`Reading Excel file: ${excelPath}`);
    
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false });
    console.log(`Found ${data.length} rows in Excel file`);
    
    if (data.length === 0) {
      console.error('No data found in Excel file');
      return;
    }
    
    // Log first few rows to understand structure
    console.log('\nFirst 5 rows:');
    console.log(JSON.stringify(data.slice(0, 5), null, 2));
    
    // Determine column mapping (adjust based on actual Excel structure)
    // Common column names: Date, Description, Amount, Type, etc.
    const firstRow = data[0];
    if (!firstRow) {
      throw new Error('No data rows found in Excel file');
    }
    
    const columns = Object.keys(firstRow);
    console.log('\nColumns found:', columns);
    
    // Try to identify columns (case-insensitive search)
    let dateCol = columns.find(col => 
      col.toLowerCase().includes('date')
    );
    let descCol = columns.find(col => {
      const lower = col.toLowerCase();
      return lower.includes('description') || 
             lower.includes('desc') ||
             lower.includes('name') ||
             lower.includes('transaction') ||
             lower.includes('detail') ||
             lower.includes('item');
    });
    let amountCol = columns.find(col => {
      const lower = col.toLowerCase();
      return lower.includes('amount') || 
             lower.includes('value') ||
             lower.includes('price') ||
             lower.includes('total');
    });
    let typeCol = columns.find(col => {
      const lower = col.toLowerCase();
      return lower.includes('type') || 
             lower.includes('category') ||
             lower.includes('income') ||
             lower.includes('expense');
    });
    
    // If not found, use first few columns as fallback
    if (!dateCol && columns.length > 0) dateCol = columns[0];
    if (!descCol && columns.length > 1) descCol = columns[1];
    if (!amountCol && columns.length > 2) amountCol = columns[2];
    if (!typeCol && columns.length > 3) typeCol = columns[3];
    
    console.log('\nColumn mapping:');
    console.log(`Date: ${dateCol}`);
    console.log(`Description: ${descCol}`);
    console.log(`Amount: ${amountCol}`);
    console.log(`Type: ${typeCol || 'Not found'}`);
    
    // Create book "Rich Dad"
    console.log('\nCreating book "Rich Dad"...');
    const { data: bookData, error: bookError } = await supabase
      .from('books')
      .insert({
        name: 'Rich Dad',
      })
      .select()
      .single();
    
    let bookId;
    if (bookError) {
      // Check if book already exists
      if (bookError.code === '23505' || bookError.message.includes('duplicate')) {
        console.log('Book "Rich Dad" already exists, fetching it...');
        const { data: existingBook, error: fetchError } = await supabase
          .from('books')
          .select('id')
          .eq('name', 'Rich Dad')
          .single();
        
        if (existingBook) {
          bookId = existingBook.id;
        } else {
          throw new Error(`Failed to find existing book: ${fetchError?.message || 'Unknown error'}`);
        }
      } else {
        throw bookError;
      }
    } else {
      bookId = bookData.id;
    }
    console.log(`Book created/found with ID: ${bookId}`);
    
    // Add Chinmaya Kapopara as owner
    const userEmail = 'kapopara.king@gmail.com';
    console.log(`\nAdding ${userEmail} as owner...`);
    
    const { error: memberError } = await supabase
      .from('book_members')
      .upsert({
        book_id: bookId,
        user_email: userEmail,
        role: 'owner',
      }, {
        onConflict: 'book_id,user_email'
      });
    
    if (memberError) {
      console.warn('Error adding member (might already exist):', memberError.message);
    } else {
      console.log('User added as owner successfully');
    }
    
    // Process and insert transactions
    console.log('\nProcessing transactions...');
    const transactions = [];
    const addedBy = 'Chinmay Kapopara';
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      // Skip empty rows
      if (!row[dateCol] && !row[descCol] && !row[amountCol]) {
        continue;
      }
      
      // Parse date
      const dateStr = formatDateForDB(row[dateCol]);
      if (!dateStr) {
        console.warn(`Row ${i + 1}: Invalid date, skipping`);
        continue;
      }
      
      // Parse description
      const description = String(row[descCol] || '').trim();
      if (!description) {
        console.warn(`Row ${i + 1}: Missing description, skipping`);
        continue;
      }
      
      // Parse amount
      let amount = row[amountCol];
      if (typeof amount === 'string') {
        // Remove currency symbols and commas
        amount = amount.replace(/[₹$,\s]/g, '');
      }
      amount = parseFloat(amount);
      if (isNaN(amount) || amount === 0) {
        console.warn(`Row ${i + 1}: Invalid amount, skipping`);
        continue;
      }
      
      // Determine type (income or expense)
      let type = 'expense'; // Default to expense
      if (typeCol && row[typeCol]) {
        const typeStr = String(row[typeCol]).toLowerCase();
        if (typeStr.includes('income') || typeStr.includes('credit') || typeStr.includes('in')) {
          type = 'income';
        } else if (typeStr.includes('expense') || typeStr.includes('debit') || typeStr.includes('out')) {
          type = 'expense';
        }
      }
      
      // If amount is negative, it's an expense; if positive, check type column
      // But since we have a type column, use that as primary source
      // Always use absolute value for amount
      amount = Math.abs(amount);
      
      transactions.push({
        name: description,
        date: dateStr,
        amount: Math.abs(amount), // Always positive
        type: type,
        added_by: addedBy,
        party: null,
        timestamp: getTimestamp() + i, // Add small increment to ensure unique timestamps
        book_id: bookId,
      });
    }
    
    console.log(`\nPrepared ${transactions.length} transactions for import`);
    
    // Insert transactions in batches
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      console.log(`Inserting batch ${Math.floor(i / batchSize) + 1} (${batch.length} transactions)...`);
      
      const { error: insertError } = await supabase
        .from('transactions')
        .insert(batch);
      
      if (insertError) {
        console.error(`Error inserting batch:`, insertError);
        // Try inserting one by one to identify problematic rows
        for (const transaction of batch) {
          const { error: singleError } = await supabase
            .from('transactions')
            .insert(transaction);
          
          if (singleError) {
            console.error(`Error inserting transaction "${transaction.name}":`, singleError.message);
          } else {
            inserted++;
          }
        }
      } else {
        inserted += batch.length;
      }
    }
    
    console.log(`\n✅ Successfully imported ${inserted} transactions!`);
    console.log(`Book ID: ${bookId}`);
    console.log(`Book Name: Rich Dad`);
    console.log(`Owner: ${userEmail}`);
    
  } catch (error) {
    console.error('Error importing transactions:', error);
    process.exit(1);
  }
}

// Run the import
importTransactions();
