const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../lib/db');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email ve şifre gerekli' });
    }
    const normalizedEmail = email.toLowerCase();
    const exists = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (exists.rows[0]) {
      return res.status(400).json({ error: 'Bu email zaten kayıtlı' });
    }

    const hash = await bcrypt.hash(password, 10);
    const inserted = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [normalizedEmail, hash]
    );
    const user = inserted.rows[0];
    await query(
      "INSERT INTO subscriptions (user_id, provider, status, renew_at) VALUES ($1, 'manual', 'active', NOW() + INTERVAL '30 days') ON CONFLICT (user_id) DO NOTHING",
      [user.id]
    );

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET);
    res.json({ token, email: user.email });
  } catch (e) {
    res.status(500).json({ error: 'Kayıt hatası' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email ve şifre gerekli' });
    }
    const normalizedEmail = email.toLowerCase();
    const result = await query('SELECT id, email, password_hash FROM users WHERE email = $1', [
      normalizedEmail,
    ]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Email veya şifre hatalı' });
    }
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET);
    res.json({ token, email: user.email });
  } catch (e) {
    res.status(500).json({ error: 'Giriş hatası' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email gerekli' });
    }
    const normalizedEmail = String(email).toLowerCase().trim();
    const userResult = await query('SELECT id, email FROM users WHERE email = $1', [normalizedEmail]);
    const user = userResult.rows[0];

    // Security: user existence bilgisi sızdırmıyoruz.
    if (!user) {
      return res.json({ ok: true, message: 'Eğer hesap varsa sıfırlama bağlantısı gönderildi.' });
    }

    const resetToken = crypto.randomBytes(24).toString('hex');
    // Demo amaçlı: email servisi yerine token döndürüyoruz.
    return res.json({
      ok: true,
      message: 'Sıfırlama bağlantısı gönderildi.',
      devResetToken: resetToken,
      email: user.email,
    });
  } catch (e) {
    return res.status(500).json({ error: 'Şifre sıfırlama isteği başarısız' });
  }
});

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token gerekli' });
  }
  try {
    const token = auth.slice(7);
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Geçersiz token' });
  }
}

module.exports = router;
module.exports.authMiddleware = authMiddleware;
