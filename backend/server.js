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
  await initDb();
  app.listen(PORT, () => {
    console.log(`VPN Backend http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Startup error:', err.message);
  process.exit(1);
});
