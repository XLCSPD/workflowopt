#!/usr/bin/env node
/**
 * Upload training assets to Supabase Storage
 * 
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=your-key node scripts/upload-training-assets.mjs
 * 
 * Or set it in your .env.local file and run:
 *   node scripts/upload-training-assets.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Load .env.local
config({ path: join(rootDir, '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL is not set');
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is not set');
  console.error('');
  console.error('To get your service role key:');
  console.error('1. Go to https://supabase.com/dashboard/project/rnmgqwsujxqvsdlfdscw/settings/api');
  console.error('2. Copy the "service_role" key under "Project API keys"');
  console.error('3. Run: SUPABASE_SERVICE_ROLE_KEY=your-key node scripts/upload-training-assets.mjs');
  process.exit(1);
}

// Create admin client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const BUCKET_NAME = 'training-docs';

const FILES_TO_UPLOAD = [
  {
    localPath: join(rootDir, 'docs', '📘 Process Optimization Tool - User Guide.pdf'),
    storagePath: 'Process_Optimization_Tool_User_Guide.pdf',
    contentType: 'application/pdf'
  },
  {
    localPath: join(rootDir, 'docs', 'ProcessOpt_Operational_Excellence_Guide.pdf'),
    storagePath: 'ProcessOpt_Operational_Excellence_Guide.pdf',
    contentType: 'application/pdf'
  }
];

async function createBucketIfNotExists() {
  console.log(`Checking if bucket "${BUCKET_NAME}" exists...`);
  
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('Error listing buckets:', listError);
    throw listError;
  }
  
  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
  
  if (!bucketExists) {
    console.log(`Creating bucket "${BUCKET_NAME}"...`);
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ['application/pdf'],
      fileSizeLimit: 52428800 // 50MB
    });
    
    if (createError) {
      console.error('Error creating bucket:', createError);
      throw createError;
    }
    console.log(`Bucket "${BUCKET_NAME}" created successfully!`);
  } else {
    console.log(`Bucket "${BUCKET_NAME}" already exists.`);
  }
}

async function uploadFile(localPath, storagePath, contentType) {
  console.log(`\nUploading: ${storagePath}`);
  
  if (!existsSync(localPath)) {
    console.error(`  Error: File not found: ${localPath}`);
    return false;
  }
  
  const fileBuffer = readFileSync(localPath);
  console.log(`  Size: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: true
    });
  
  if (error) {
    console.error(`  Error uploading: ${error.message}`);
    return false;
  }
  
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);
  
  console.log(`  Success! Public URL: ${urlData.publicUrl}`);
  return true;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Uploading Training Assets to Supabase Storage');
  console.log('='.repeat(60));
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log('');
  
  try {
    await createBucketIfNotExists();
    
    let successCount = 0;
    for (const file of FILES_TO_UPLOAD) {
      const success = await uploadFile(file.localPath, file.storagePath, file.contentType);
      if (success) successCount++;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`Uploaded ${successCount}/${FILES_TO_UPLOAD.length} files successfully!`);
    
    if (successCount === FILES_TO_UPLOAD.length) {
      console.log('\nNext step: Run the seed script to create training modules:');
      console.log('  psql $DATABASE_URL -f supabase/seed-app-overview-training.sql');
      console.log('\nOr use the Supabase CLI:');
      console.log('  supabase db execute --file supabase/seed-app-overview-training.sql');
    }
    
  } catch (error) {
    console.error('\nFailed:', error.message);
    process.exit(1);
  }
}

main();

