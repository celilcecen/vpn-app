const express = require('express');
const { query } = require('../lib/db');
const {
  getInterfaceState,
  WG_RUNTIME_ENABLED,
  WG_INTERFACE,
} = require('../lib/wireguardRuntime');
const router = express.Router();
const ADMIN_SETUP_TOKEN = process.env.ADMIN_SETUP_TOKEN;

function requireAdmin(req, res, next) {
  if (!ADMIN_SETUP_TOKEN) {
    return res.status(503).json({ error: 'ADMIN_SETUP_TOKEN tanımlı değil' });
  }
  const token = req.headers['x-admin-token'];
  if (!token || token !== ADMIN_SETUP_TOKEN) {
    return res.status(401).json({ error: 'Yetkisiz istek' });
  }
  return next();
}

router.post('/node', requireAdmin, async (req, res) => {
  try {
    const { id, country, code, endpoint, serverPublicKey, ping = 0, capacity = 500 } = req.body || {};
    if (!id || !country || !code || !endpoint || !serverPublicKey) {
      return res
        .status(400)
        .json({ error: 'id, country, code, endpoint, serverPublicKey alanları zorunludur' });
    }
    await query(
      `INSERT INTO vpn_nodes (id, country, code, endpoint, server_public_key, ping, capacity, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
       ON CONFLICT (id) DO UPDATE
       SET country = EXCLUDED.country,
           code = EXCLUDED.code,
           endpoint = EXCLUDED.endpoint,
           server_public_key = EXCLUDED.server_public_key,
           ping = EXCLUDED.ping,
           capacity = EXCLUDED.capacity,
           status = 'active'`,
      [id, country, code, endpoint, serverPublicKey, ping, capacity]
    );
    res.json({ ok: true, message: 'Node kaydedildi' });
  } catch (e) {
    res.status(500).json({ error: 'Yapılandırma hatası: ' + e.message });
  }
});

router.get('/status', async (req, res) => {
  try {
    const nodes = await query("SELECT COUNT(*)::int AS count FROM vpn_nodes WHERE status = 'active'");
    const peers = await query("SELECT COUNT(*)::int AS count FROM vpn_peers WHERE status = 'active'");
    res.json({ configured: nodes.rows[0].count > 0, activeNodes: nodes.rows[0].count, activePeers: peers.rows[0].count });
  } catch (e) {
    res.status(500).json({ error: 'Durum alınamadı' });
  }
});

router.get('/runtime', async (req, res) => {
  try {
    const state = await getInterfaceState();
    res.json({
      wgRuntimeEnabled: !!WG_RUNTIME_ENABLED,
      wgInterface: WG_INTERFACE,
      interfaceUp: !!state.interfaceUp,
      reason: state.reason || null,
      activePeers: state.peers ? state.peers.length : 0,
    });
  } catch (e) {
    res.status(500).json({ error: 'Runtime durumu alınamadı', detail: e.message });
  }
});

router.get('/diag', requireAdmin, async (req, res) => {
  try {
    const state = await getInterfaceState();
    const dbNodes = await query("SELECT COUNT(*)::int AS c FROM vpn_nodes WHERE status='active'");
    const dbPeers = await query("SELECT COUNT(*)::int AS c FROM vpn_peers WHERE status='active'");
    res.json({
      env: {
        WG_RUNTIME_ENABLED: !!WG_RUNTIME_ENABLED,
        WG_INTERFACE,
        WG_BIN: process.env.WG_BIN || 'wg',
        DEFAULT_DNS: process.env.DEFAULT_DNS || '1.1.1.1, 8.8.8.8',
        ALLOW_PRIVATE_ENDPOINTS: process.env.ALLOW_PRIVATE_ENDPOINTS === 'true',
        DATABASE_URL_present: !!process.env.DATABASE_URL,
        JWT_SECRET_present: !!process.env.JWT_SECRET,
        ADMIN_SETUP_TOKEN_present: !!process.env.ADMIN_SETUP_TOKEN,
        BILLING_WEBHOOK_SECRET_present: !!process.env.BILLING_WEBHOOK_SECRET,
      },
      runtime: state,
      db: {
        activeNodes: dbNodes.rows[0].c,
        activePeers: dbPeers.rows[0].c,
        kernelPeerCount: state.peers ? state.peers.length : 0,
        synced: state.peers ? state.peers.length === dbPeers.rows[0].c : false,
      },
      now: Math.floor(Date.now() / 1000),
    });
  } catch (e) {
    res.status(500).json({ error: 'Diag alınamadı', detail: e.message });
  }
});

module.exports = router;
