const express = require('express');
const { query } = require('../lib/db');
const { authMiddleware } = require('./auth');

const router = express.Router();

const PLANS = [
  { id: 'basic-monthly', title: 'Basic Aylık', price: 4.99, currency: 'USD', period: 'month', maxDevices: 1 },
  { id: 'pro-monthly', title: 'Pro Aylık', price: 9.99, currency: 'USD', period: 'month', maxDevices: 3 },
  { id: 'pro-yearly', title: 'Pro Yıllık', price: 79.99, currency: 'USD', period: 'year', maxDevices: 5 },
];

router.get('/plans', (_req, res) => {
  return res.json(PLANS);
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    if (!req.user || !req.user.userId) return res.status(401).json({ error: 'Geçersiz token payload' });
    const subscription = await query(
      'SELECT provider, status, renew_at FROM subscriptions WHERE user_id = $1 LIMIT 1',
      [req.user.userId]
    );
    return res.json({
      subscription:
        subscription.rows[0] || { provider: 'none', status: 'inactive', renew_at: null },
    });
  } catch (e) {
    return res.status(500).json({ error: 'Abonelik bilgisi alınamadı' });
  }
});

router.post('/purchase', authMiddleware, async (req, res) => {
  try {
    if (!req.user || !req.user.userId) return res.status(401).json({ error: 'Geçersiz token payload' });
    const { planId } = req.body || {};
    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) return res.status(400).json({ error: 'Geçersiz plan' });

    const renewAtExpr = plan.period === 'year' ? "NOW() + INTERVAL '1 year'" : "NOW() + INTERVAL '30 days'";
    await query(
      `INSERT INTO subscriptions (user_id, provider, status, renew_at, updated_at)
       VALUES ($1, 'inapp-demo', 'active', ${renewAtExpr}, NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET provider = EXCLUDED.provider,
           status = 'active',
           renew_at = EXCLUDED.renew_at,
           updated_at = NOW()`,
      [req.user.userId]
    );

    return res.json({
      ok: true,
      message: 'Satın alma başarılı (demo)',
      plan,
    });
  } catch (e) {
    return res.status(500).json({ error: 'Satın alma başarısız' });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    const { email, status, provider = 'manual', renewAt } = req.body || {};
    if (!email || !status) {
      return res.status(400).json({ error: 'email ve status zorunlu' });
    }

    const userResult = await query('SELECT id FROM users WHERE email = $1', [String(email).toLowerCase()]);
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    await query(
      `INSERT INTO subscriptions (user_id, provider, status, renew_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET provider = EXCLUDED.provider,
           status = EXCLUDED.status,
           renew_at = EXCLUDED.renew_at,
           updated_at = NOW()`,
      [user.id, provider, status, renewAt || null]
    );

    if (status !== 'active') {
      await query("UPDATE vpn_peers SET status = 'revoked' WHERE user_id = $1 AND status = 'active'", [user.id]);
    }

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'Webhook işlenemedi' });
  }
});

module.exports = router;
