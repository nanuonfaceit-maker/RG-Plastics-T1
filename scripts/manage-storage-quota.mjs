import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://udyimdookqjagutmvrvl.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_89u2MorE7bTxtAALobEBzg_xa5obL3a';
const BUCKET_NAME = 'temp_quota_storage';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanStorage() {
  console.log(`Cleaning up bucket "${BUCKET_NAME}"...`);
  const { data: files, error: listErr } = await supabase.storage.from(BUCKET_NAME).list();
  if (listErr) {
    console.error('Error listing files:', listErr.message);
    return;
  }

  if (files && files.length > 0) {
    const filePaths = files.map((f) => f.name);
    const { error: delErr } = await supabase.storage.from(BUCKET_NAME).remove(filePaths);
    if (delErr) {
      console.error('Error deleting files:', delErr.message);
    } else {
      console.log(`Successfully deleted ${filePaths.length} dummy files from "${BUCKET_NAME}".`);
    }
  } else {
    console.log('No files to clean in bucket.');
  }
}

async function fillStorage(totalMB = 850) {
  console.log(`Starting storage fill target: ~${totalMB} MB into bucket "${BUCKET_NAME}"...`);
  console.log('Note: Free tier enforces a 50 MB per-file upload limit. Uploading 48 MB chunks.');

  const chunkSizeMB = 48;
  const chunkCount = Math.ceil(totalMB / chunkSizeMB);
  const chunkBytes = chunkSizeMB * 1024 * 1024;
  const dummyBuffer = Buffer.alloc(chunkBytes, 'Z');

  for (let i = 1; i <= chunkCount; i++) {
    const fileName = `dummy_quota_chunk_${String(i).padStart(2, '0')}.bin`;
    process.stdout.write(`Uploading chunk ${i}/${chunkCount} (${fileName}, ${chunkSizeMB} MB)... `);

    const { error } = await supabase.storage.from(BUCKET_NAME).upload(fileName, dummyBuffer, {
      contentType: 'application/octet-stream',
      upsert: true,
    });

    if (error) {
      console.log(`FAILED: ${error.message}`);
      if (error.message.includes('bucket not found') || error.message.includes('violates row-level security')) {
        console.log('\nPlease ensure the bucket and policies are created in Supabase SQL Editor first.');
        break;
      }
    } else {
      console.log('DONE');
    }
  }

  console.log(`\nCompleted upload process. Total uploaded: ~${chunkCount * chunkSizeMB} MB.`);
}

const isClean = process.argv.includes('--clean');
if (isClean) {
  cleanStorage();
} else {
  fillStorage();
}
