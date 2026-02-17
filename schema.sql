-- Birthday Cards Table for Cloudflare D1
CREATE TABLE IF NOT EXISTS birthday_cards (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  message TEXT,
  slug TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, id)
);

CREATE INDEX IF NOT EXISTS idx_slug ON birthday_cards(slug);
CREATE INDEX IF NOT EXISTS idx_created_at ON birthday_cards(created_at);

-- Insert sample data for testing
INSERT INTO birthday_cards (id, name, age, message, slug) VALUES
  ('ABC123', 'John', 25, 'Happy Birthday! Have an amazing day!', 'john'),
  ('XYZ789', 'Sarah', 30, 'Wishing you joy and happiness!', 'sarah'),
  ('DEF456', 'Mike', 28, 'Another year older, another year wiser!', 'mike');
