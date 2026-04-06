/**
 * WireGuard anahtar çifti üretir.
 * Sunucu tarafında: wg genkey | tee privatekey | wg pubkey > publickey
 * Bu script Node ile key üretmez (wg CLI gerekir); sadece kullanım talimatı.
 * Gerçek üretim için: npm install tweetnacl (ve base64) veya sistemde wg CLI kullanın.
 */
const crypto = require('crypto');

// WireGuard X25519 kullanır; Node.js'de crypto.createDiffieHellman veya curve25519 gerekir.
// Basit örnek: rastgele 32 byte base64 = WireGuard private key formatına yakın.
// NOT: WireGuard'ın kendi formatı var; production'da `wg genkey` çıktısı kullanılmalı.
function generatePrivateKey() {
  return crypto.randomBytes(32).toString('base64');
}

// WireGuard public key, private key'den türetilir. Node crypto ile doğrudan X25519:
// crypto.createPublicKey / createPrivateKey ile Curve25519 desteklenebilir (Node 18+).
// Bu script sadece placeholder üretir; gerçek key için sunucuda `wg genkey` kullanın.
function placeholderKey() {
  return crypto.randomBytes(32).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').slice(0, 44);
}

console.log('WireGuard anahtarları sunucuda şu komutlarla üretilir:');
console.log('  wg genkey | tee client_private.key | wg pubkey > client_public.key');
console.log('');
console.log('Placeholder (test için - gerçek tünel için wg genkey kullanın):');
console.log('Client Private:', placeholderKey());
console.log('Server Public:  sunucuda wg pubkey < server_private.key ile alınır.');
console.log('');
console.log('backend/data/configs.json içine clientPrivateKey,');
console.log('backend/data/servers.json içine serverPublicKey ve endpoint (IP:51820) yazın.');
