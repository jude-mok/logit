import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('logit.db');

export function initDatabase(): void {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS moments (
      id INTEGER PRIMARY KEY,
      image_path TEXT NOT NULL,
      comment TEXT,
      is_starred INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
}

export function saveMoments(moments: any[]): void {
  db.withTransactionSync(() => {
    for (const m of moments) {
      db.runSync(
        `INSERT OR REPLACE INTO moments 
         (id, image_path, comment, is_starred, created_at) 
         VALUES (?, ?, ?, ?, ?)`,
        [m.id, m.image_path, m.comment ?? null, m.is_starred ? 1 : 0, m.created_at]
      );
    }
  });
}

export function getLocalMoments(): any[] {
  return db.getAllSync(`SELECT * FROM moments ORDER BY created_at DESC`);
}