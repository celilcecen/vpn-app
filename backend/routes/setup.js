const express = require('express');
const { query } = require('../lib/db');
const router = express.Router();

router.post('/node', async (req, res) => {
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

module.exports = router;
