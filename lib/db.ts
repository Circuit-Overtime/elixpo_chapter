import { D1Database } from '@cloudflare/workers-types';

let db: D1Database | null = null;

export function initDB(database: D1Database) {
  db = database;
}

export function getDB(): D1Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export async function createCardSchema() {
  if (!db) return;
  
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS birthday_cards (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        message TEXT,
        slug TEXT NOT NULL,
        public BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_slug ON birthday_cards(slug);
      CREATE INDEX IF NOT EXISTS idx_public ON birthday_cards(public);
    `);
  } catch (error) {
    console.error('Error creating schema:', error);
  }
}
