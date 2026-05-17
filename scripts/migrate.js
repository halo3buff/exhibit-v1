#!/usr/bin/env node
// scripts/migrate.js — run ordered SQL migrations against app.db
//
// Usage:
//   node scripts/migrate.js               # uses ./app.db
//   node scripts/migrate.js --db /path/to/app.db
//
// Each .sql file in db/migrations/ is applied once, in filename order.
// Applied migrations are tracked in the schema_migrations table.

import Database from 'better-sqlite3';
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const dbArg = process.argv.indexOf('--db');
const dbPath = dbArg !== -1
  ? path.resolve(process.argv[dbArg + 1])
  : path.join(ROOT, 'app.db');

const migrationsDir = path.join(ROOT, 'db', 'migrations');

console.log(`Database: ${dbPath}`);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    filename  TEXT UNIQUE NOT NULL,
    appliedAt TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const applied = new Set(
  db.prepare('SELECT filename FROM schema_migrations').all().map(r => r.filename)
);

const files = (await readdir(migrationsDir))
  .filter(f => f.endsWith('.sql'))
  .sort();

let count = 0;
for (const file of files) {
  if (applied.has(file)) {
    console.log(`  skip  ${file}`);
    continue;
  }
  const sql = await readFile(path.join(migrationsDir, file), 'utf8');
  db.transaction(() => {
    db.exec(sql);
    db.prepare('INSERT INTO schema_migrations (filename) VALUES (?)').run(file);
  })();
  console.log(`  apply ${file}`);
  count++;
}

db.close();
console.log(`\nDone — ${count} migration(s) applied.`);
