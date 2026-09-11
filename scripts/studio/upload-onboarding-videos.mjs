#!/usr/bin/env node
// Uploads onboarding/banner videos to the public Supabase Storage bucket
// "onboarding", so they're served from storage instead of bundled into
// the Vite build. The original 24 files (src/assets/banners/*.mp4, ~446MB
// combined) were the single largest contributor to dist size and are no
// longer in this repo at all -- static, rarely-changed marketing/
// explainer clips have no reason to be part of the JS bundle, or to live
// in git as binary blobs. src/data/learnShareVideos.ts references them
// by storage URL now (banner-NN-<name>.mp4, matching the names already
// live in the bucket).
//
// Because the source files aren't in the repo, this takes the directory
// to upload FROM as an argument -- point it at wherever you've put a
// replacement/new video locally. Filenames uploaded become the object
// names in the bucket (and so must match what learnShareVideos.ts
// expects, e.g. banner-01-community-orchard.mp4, if you're replacing an
// existing one rather than adding a new one).
//
// Idempotent: creates the bucket if it doesn't exist yet, and every
// upload uses upsert:true -- safe to re-run, re-uploading just overwrites
// with the same or new bytes under the same name.
//
// Run:
//   SUPABASE_SERVICE_ROLE_KEY=<service role key> node scripts/studio/upload-onboarding-videos.mjs /path/to/videos
//
// Get the service role key from the Supabase dashboard -> the project ->
// Project Settings -> API -> "Project API keys" -> service_role (never
// commit this key or put it in a VITE_ var -- it bypasses RLS entirely).
// SUPABASE_URL / VITE_SUPABASE_URL are optional -- defaults to the
// project this app already ships against.

import { createClient } from '@supabase/supabase-js';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const SOURCE_DIR = process.argv[2];
const BUCKET = 'onboarding';

if (!SOURCE_DIR) {
  console.error(
    'Missing source directory.\n' +
    'Usage: SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/studio/upload-onboarding-videos.mjs /path/to/videos',
  );
  process.exit(1);
}

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error(
    'Missing SUPABASE_SERVICE_ROLE_KEY.\n' +
    'Get it from the Supabase dashboard -> Project Settings -> API -> service_role key, then:\n' +
    '  SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/studio/upload-onboarding-videos.mjs',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function ensureBucket() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  if (buckets.some((b) => b.id === BUCKET)) {
    console.log(`Bucket "${BUCKET}" already exists.`);
    return;
  }
  const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: '50MB',
    allowedMimeTypes: ['video/mp4'],
  });
  if (createErr) throw createErr;
  console.log(`Created public bucket "${BUCKET}".`);
}

async function uploadAll() {
  const resolvedDir = path.resolve(SOURCE_DIR);
  const files = (await readdir(resolvedDir)).filter((f) => f.endsWith('.mp4')).sort();
  console.log(`Found ${files.length} video(s) in ${resolvedDir}`);

  let failed = 0;
  for (const file of files) {
    const bytes = await readFile(path.join(resolvedDir, file));
    const { error } = await supabase.storage.from(BUCKET).upload(file, bytes, {
      contentType: 'video/mp4',
      cacheControl: '31536000', // 1 year -- static, rarely-changed marketing clips
      upsert: true,
    });
    if (error) {
      console.error(`FAILED  ${file} -- ${error.message}`);
      failed++;
      continue;
    }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(file);
    console.log(`OK      ${file}  ->  ${pub.publicUrl}`);
  }
  if (failed > 0) {
    console.error(`\n${failed} of ${files.length} upload(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log(`\nAll ${files.length} uploaded.`);
  }
}

await ensureBucket();
await uploadAll();
