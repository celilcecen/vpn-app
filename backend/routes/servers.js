const express = require('express');
const { query } = require('../lib/db');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await query(
      "SELECT id, country, code, ping FROM vpn_nodes WHERE status = 'active' ORDER BY country ASC"
    );
    const list = result.rows.map(({ id, country, code, ping }) => ({ id, country, code, ping: ping || 0 }));
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: 'Sunucu listesi alınamadı' });
  }
});

module.exports = router;
