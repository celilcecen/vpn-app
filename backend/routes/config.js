const express = require('express');
const { query } = require('../lib/db');
const { generateWireGuardKeyPair, buildConfig } = require('../lib/wireguard');
const { applyPeer } = require('../lib/wireguardRuntime');
const { authMiddleware } = require('./auth');
const router = express.Router();

const DEVICE_LIMIT = Number(process.env.DEVICE_LIMIT || 3);
const DEFAULT_DNS = process.env.DEFAULT_DNS || '1.1.1.1, 8.8.8.8';
const ALLOW_PRIVATE_ENDPOINTS = process.env.ALLOW_PRIVATE_ENDPOINTS === 'true';

function isPrivateIpv4(host) {
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false;
  const [a, b] = host.split('.').map(Number);
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function validateEndpoint(endpoint) {
  const trimmed = String(endpoint || '').trim();
  const match = trimmed.match(/^([^:]+):(\d{1,5})$/);
  if (!match) return false;
  const host = match[1];
  const port = Number(match[2]);
  if (!port || port > 65535) return false;
  if (isPrivateIpv4(host) && !ALLOW_PRIVATE_ENDPOINTS) return false;
  return true;
}

async function ensureActiveSubscription(userId) {
  const sub = await query('SELECT status FROM subscriptions WHERE user_id = $1 LIMIT 1', [userId]);
  if (!sub.rows[0] || sub.rows[0].status !== 'active') {
    return false;
  }
  return true;
}

async function ensureDevice(userId, deviceId, platform) {
  const existing = await query('SELECT id FROM devices WHERE user_id = $1 AND device_id = $2', [
    userId,
    deviceId,
  ]);
  if (existing.rows[0]) {
    await query('UPDATE devices SET last_seen_at = NOW(), platform = COALESCE($1, platform) WHERE id = $2', [
      platform || null,
      existing.rows[0].id,
    ]);
    return existing.rows[0].id;
  }

  const count = await query('SELECT COUNT(*)::int AS count FROM devices WHERE user_id = $1', [userId]);
  if (count.rows[0].count >= DEVICE_LIMIT) {
    throw new Error('DEVICE_LIMIT_EXCEEDED');
  }

  const inserted = await query(
    'INSERT INTO devices (user_id, device_id, platform) VALUES ($1, $2, $3) RETURNING id',
    [userId, deviceId, platform || null]
  );
  return inserted.rows[0].id;
}

function ipToInt(ip) {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + parts[3];
}

function intToIp(intVal) {
  return `${(intVal >>> 24) & 255}.${(intVal >>> 16) & 255}.${(intVal >>> 8) & 255}.${intVal & 255}`;
}

async function allocateIp(nodeId) {
  const network = process.env.VPN_NETWORK_BASE || '10.50.0.0';
  const base = ipToInt(network);
  for (let host = 2; host < 255; host += 1) {
    const candidate = `${intToIp(base + host)}/32`;
    const used = await query('SELECT id FROM vpn_peers WHERE node_id = $1 AND assigned_ip = $2 LIMIT 1', [
      nodeId,
      candidate,
    ]);
    if (!used.rows[0]) return candidate;
  }
  throw new Error('IP_POOL_EXHAUSTED');
}

router.post('/config', authMiddleware, async (req, res) => {
  try {
    const {
      serverId,
      deviceId = 'default-device',
      platform,
      routeMode = 'full',
      dnsLeakProtection = true,
    } = req.body;
    if (!serverId) {
      return res.status(400).json({ error: 'serverId gerekli' });
    }

    if (!req.user.userId) {
      return res.status(401).json({ error: 'Geçersiz token payload' });
    }

    const isActive = await ensureActiveSubscription(req.user.userId);
    if (!isActive) {
      return res.status(402).json({ error: 'Aktif abonelik gerekli' });
    }

    const nodeResult = await query(
      "SELECT id, endpoint, server_public_key, capacity FROM vpn_nodes WHERE id = $1 AND status = 'active' LIMIT 1",
      [serverId]
    );
    const node = nodeResult.rows[0];
    if (!node) {
      return res.status(404).json({ error: 'Sunucu bulunamadı' });
    }
    if (!validateEndpoint(node.endpoint)) {
      return res.status(503).json({
        error: 'Sunucu endpoint geçersiz veya private ağda. Public endpoint tanımlayın.',
      });
    }

    const activeCount = await query(
      "SELECT COUNT(*)::int AS count FROM vpn_peers WHERE node_id = $1 AND status = 'active'",
      [serverId]
    );
    if (activeCount.rows[0].count >= node.capacity) {
      return res.status(429).json({ error: 'Bu sunucu dolu. Lütfen başka ülke deneyin.' });
    }

    const dbDeviceId = await ensureDevice(req.user.userId, String(deviceId), platform);
    const existingPeer = await query(
      "SELECT client_private_key, client_public_key, assigned_ip, dns FROM vpn_peers WHERE device_id = $1 AND node_id = $2 AND status = 'active' LIMIT 1",
      [dbDeviceId, serverId]
    );

    let clientPrivateKey;
    let clientPublicKey;
    let assignedIp;
    let dns;

    if (existingPeer.rows[0]) {
      clientPrivateKey = existingPeer.rows[0].client_private_key;
      clientPublicKey = existingPeer.rows[0].client_public_key;
      assignedIp = existingPeer.rows[0].assigned_ip;
      dns = existingPeer.rows[0].dns;
    } else {
      const keys = generateWireGuardKeyPair();
      assignedIp = await allocateIp(serverId);
      dns = dnsLeakProtection ? DEFAULT_DNS : '1.1.1.1';
      await query(
        `INSERT INTO vpn_peers (user_id, device_id, node_id, client_private_key, client_public_key, assigned_ip, dns, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')`,
        [req.user.userId, dbDeviceId, serverId, keys.privateKey, keys.publicKey, assignedIp, dns]
      );
      clientPrivateKey = keys.privateKey;
      clientPublicKey = keys.publicKey;
    }

    await applyPeer({ publicKey: clientPublicKey, assignedIp });

    const allowedIPs = routeMode === 'split' ? '10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16' : '0.0.0.0/0, ::/0';

    const configString = buildConfig({
      clientPrivateKey,
      assignedIp,
      dns,
      serverPublicKey: node.server_public_key,
      endpoint: node.endpoint,
      allowedIPs,
    });

    return res.json({ config: configString });
  } catch (e) {
    if (e.message === 'DEVICE_LIMIT_EXCEEDED') {
      return res.status(429).json({ error: `Cihaz limiti aşıldı (max ${DEVICE_LIMIT})` });
    }
    if (e.message === 'IP_POOL_EXHAUSTED') {
      return res.status(503).json({ error: 'IP havuzu dolu, node kapasitesi artırılmalı' });
    }
    res.status(500).json({ error: 'Config alınamadı' });
  }
});

module.exports = router;
