// migrate-sessions.mjs
// Run once: node migrate-sessions.mjs
// Upgrades session tokens from sequential integers to crypto-random hex strings.

import Database from 'better-sqlite3';

const db = new Database('artworks.db');

try {
  // Check if already migrated (id column already TEXT type)
  const tableInfo = db.prepare(`PRAGMA table_info(sessions)`).all();
  const idCol = tableInfo.find(c => c.name === 'id');

  if (!idCol) {
    console.log('No sessions table found — nothing to migrate.');
    db.close();
    process.exit(0);
  }

  if (idCol.type === 'TEXT') {
    console.log('Already migrated — sessions.id is already TEXT. Nothing to do.');
    db.close();
    process.exit(0);
  }

  console.log('Starting migration...');

  // SQLite does not support modifying column types directly.
  // Strategy: recreate the sessions table with id as TEXT.
  db.exec(`
    BEGIN;

    CREATE TABLE sessions_new (
      id        TEXT    PRIMARY KEY,
      userId    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expiresAt TEXT    NOT NULL,
      createdAt TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    DROP TABLE sessions;

    ALTER TABLE sessions_new RENAME TO sessions;

    COMMIT;
  `);

  console.log('Migration done. Old sessions cleared (users will need to log in again).');

} catch (e) {
  console.error('Migration error:', e.message);
  try { db.exec('ROLLBACK'); } catch (_) {}
} finally {
  db.close();
}
