require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./lib/db');

const authRoutes = require('./routes/auth');
const serversRoutes = require('./routes/servers');
const configRoutes = require('./routes/config');
const setupRoutes = require('./routes/setup');
const billingRoutes = require('./routes/billing');

const app = express();
const PORT = process.env.PORT || 3000;

function assertRequiredEnv(name) {
  if (!process.env[name]) {
    throw new Error(`${name} is required`);
  }
}

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/servers', serversRoutes);
app.use('/vpn', configRoutes);
app.use('/setup', setupRoutes);
app.use('/billing', billingRoutes);

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

async function bootstrap() {
  assertRequiredEnv('JWT_SECRET');
  assertRequiredEnv('ADMIN_SETUP_TOKEN');
  assertRequiredEnv('BILLING_WEBHOOK_SECRET');
  await initDb();
  app.listen(PORT, () => {
    console.log(`VPN Backend http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Startup error:', err.message);
  process.exit(1);
});
