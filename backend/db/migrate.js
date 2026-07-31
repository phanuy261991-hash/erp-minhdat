// Migration runner: doc cac file .sql trong backend/db/migrations/, chi ap dung
// nhung migration co version chua co trong bang schema_migrations.
// Moi migration chay trong 1 transaction rieng - loi giua chung se rollback toan bo,
// khong de schema bi ap dung mot phan.

const fs = require('fs');
const path = require('path');
const db = require('./database');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

function getAppliedVersions() {
  const tableExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'")
    .get();

  // Truong hop chay lan dau: bang schema_migrations chua ton tai (se duoc tao boi 001_init.sql).
  if (!tableExists) {
    return new Set();
  }

  const rows = db.prepare('SELECT version FROM schema_migrations').all();
  return new Set(rows.map((row) => row.version));
}

function parseVersion(fileName) {
  // Ten file dang '001_init.sql' -> lay phan so o dau lam version.
  const match = fileName.match(/^(\d+)_/);
  if (!match) {
    throw new Error(`Ten file migration khong hop le (thieu prefix so): ${fileName}`);
  }
  return parseInt(match[1], 10);
}

function runMigrations() {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort();

  const applied = getAppliedVersions();
  let appliedCount = 0;

  for (const file of files) {
    const version = parseVersion(file);
    if (applied.has(version)) {
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

    const applyMigration = db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, datetime('now'))").run(version);
    });

    applyMigration();
    console.log(`Da ap dung migration: ${file}`);
    appliedCount += 1;
  }

  if (appliedCount === 0) {
    console.log('Khong co migration moi can ap dung.');
  }
}

module.exports = { runMigrations };

if (require.main === module) {
  runMigrations();
}
