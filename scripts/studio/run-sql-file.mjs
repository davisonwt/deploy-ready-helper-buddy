// Run a .sql file against the project database as ONE simple-protocol query
// (no client-side statement splitting -- the thing Studio's editor gets
// wrong with dollar-quoted blocks). Prints every result set.
//
//   node scripts/studio/run-sql-file.mjs scripts/studio/phase-a-rpc-guard-tests.sql
//
// Connection string comes from SUPABASE_DB_URL in the environment or in the
// gitignored .env.test (Supabase dashboard -> Project Settings -> Database ->
// Connection string, URI form). Never commit that value.
//
// Needs the `pg` package; if it is not installed next to this repo, point
// NODE_PATH at a folder that has it (the scratchpad install works).

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const file = process.argv[2];
if (!file) { console.error('usage: node scripts/studio/run-sql-file.mjs <file.sql>'); process.exit(2); }

function loadEnvTest() {
  const p = resolve(process.cwd(), '.env.test');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}
loadEnvTest();

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error('SUPABASE_DB_URL is not set (env or .env.test). Nothing was run.');
  process.exit(2);
}

const { Client } = require('pg');
const sql = readFileSync(resolve(process.cwd(), file), 'utf8');
const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
client.on('notice', (n) => console.log('NOTICE:', n.message));

try {
  await client.connect();
  const started = Date.now();
  const res = await client.query(sql); // whole file, one query, server-side splitting only
  const results = Array.isArray(res) ? res : [res];
  for (const r of results) {
    if (r.command === 'SELECT' && r.rows?.length) {
      console.log(`\n== ${r.command} (${r.rowCount} rows) ==`);
      console.table(r.rows);
    } else if (r.command) {
      console.log(`-- ${r.command}${r.rowCount != null ? ` (${r.rowCount})` : ''}`);
    }
  }
  console.log(`\nran ${results.length} statements in ${Date.now() - started} ms`);
} catch (e) {
  console.error('SQL error:', e.message);
  if (e.position) console.error('at character', e.position);
  if (e.where) console.error('where:', e.where);
  process.exitCode = 1;
} finally {
  await client.end();
}
