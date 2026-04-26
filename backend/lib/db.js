const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required. Example: postgres://user:pass@localhost:5432/vpn');
}

const pool = new Pool({
  connectionString,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

async function query(text, params = []) {
  return pool.query(text, params);
}

async function initDb() {
  await query('CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())');
  await query("CREATE TABLE IF NOT EXISTS subscriptions (id SERIAL PRIMARY KEY, user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE, provider TEXT NOT NULL DEFAULT 'manual', status TEXT NOT NULL DEFAULT 'active', renew_at TIMESTAMPTZ, updated_at TIMESTAMPTZ DEFAULT NOW())");
  await query('CREATE TABLE IF NOT EXISTS devices (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, device_id TEXT NOT NULL, platform TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), last_seen_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE (user_id, device_id))');
  await query("CREATE TABLE IF NOT EXISTS vpn_nodes (id TEXT PRIMARY KEY, country TEXT NOT NULL, code TEXT NOT NULL, endpoint TEXT NOT NULL, server_public_key TEXT NOT NULL, ping INTEGER DEFAULT 0, status TEXT NOT NULL DEFAULT 'active', capacity INTEGER NOT NULL DEFAULT 500)");
  await query("CREATE TABLE IF NOT EXISTS vpn_peers (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE, node_id TEXT NOT NULL REFERENCES vpn_nodes(id) ON DELETE RESTRICT, client_private_key TEXT NOT NULL, client_public_key TEXT NOT NULL, assigned_ip TEXT NOT NULL, dns TEXT NOT NULL DEFAULT '1.1.1.1, 8.8.8.8', status TEXT NOT NULL DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE (device_id, node_id), UNIQUE (node_id, assigned_ip))");
  await seedFromJsonIfEmpty();
  await migrateUsersIfEmpty();
}

async function seedFromJsonIfEmpty() {
  const serversPath = path.join(__dirname, '../data/servers.json');
  if (!fs.existsSync(serversPath)) return;

  const servers = JSON.parse(fs.readFileSync(serversPath, 'utf8'));
  const ids = servers.map((s) => s.id);
  for (const server of servers) {
    await query(
      `INSERT INTO vpn_nodes (id, country, code, endpoint, server_public_key, ping, status, capacity)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', 500)
       ON CONFLICT (id) DO UPDATE
       SET country = EXCLUDED.country,
           code = EXCLUDED.code,
           endpoint = EXCLUDED.endpoint,
           server_public_key = EXCLUDED.server_public_key,
           ping = EXCLUDED.ping,
           status = 'active'`,
      [server.id, server.country, server.code, server.endpoint, server.serverPublicKey, server.ping || 0]
    );
  }
  if (ids.length) {
    await query(
      `DELETE FROM vpn_peers WHERE node_id NOT IN (${ids.map((_, i) => `$${i + 1}`).join(',')})`,
      ids
    );
    await query(
      `DELETE FROM vpn_nodes WHERE id NOT IN (${ids.map((_, i) => `$${i + 1}`).join(',')})`,
      ids
    );
  }
}

async function migrateUsersIfEmpty() {
  const userCount = await query('SELECT COUNT(*)::int AS count FROM users');
  if (userCount.rows[0].count > 0) return;

  const usersPath = path.join(__dirname, '../data/users.json');
  if (!fs.existsSync(usersPath)) return;
  const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
  for (const user of users) {
    const inserted = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id',
      [String(user.email || '').toLowerCase(), user.passwordHash]
    );
    const userId = inserted.rows[0] && inserted.rows[0].id;
    if (userId) {
      await query(
        "INSERT INTO subscriptions (user_id, provider, status) VALUES ($1, 'migration', 'active') ON CONFLICT (user_id) DO NOTHING",
        [userId]
      );
    }
  }
}

module.exports = { query, initDb };
