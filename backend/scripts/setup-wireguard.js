/**
 * WireGuard otomatik yapılandırma
 * Anahtarları üretir, servers.json ve configs.json günceller.
 * Kullanım: node scripts/setup-wireguard.js [SUNUCU_IP]
 * Örnek: node scripts/setup-wireguard.js 95.70.1.2
 */
const nacl = require('tweetnacl');
const fs = require('fs');
const path = require('path');

function toBase64(arr) {
  return Buffer.from(arr).toString('base64');
}

function generateKeyPair() {
  const kp = nacl.box.keyPair();
  return {
    privateKey: toBase64(kp.secretKey),
    publicKey: toBase64(kp.publicKey),
  };
}

const dataDir = path.join(__dirname, '../data');
const serversFile = path.join(dataDir, 'servers.json');
const configsFile = path.join(dataDir, 'configs.json');

const serverIP = process.argv[2] || 'YOUR_SERVER_IP';
const port = 51820;
const endpoint = `${serverIP}:${port}`;

// Sunucu anahtarları (tüm lokasyonlar aynı sunucuyu kullanıyor)
const serverKeys = generateKeyPair();

const servers = [
  { id: 'tr', country: 'Türkiye', code: 'TR', ping: 8 },
  { id: 'de', country: 'Almanya', code: 'DE', ping: 18 },
  { id: 'nl', country: 'Hollanda', code: 'NL', ping: 22 },
  { id: 'us', country: 'ABD', code: 'US', ping: 95 },
];

const configs = {};
const clientAddresses = ['10.0.0.2/32', '10.0.0.3/32', '10.0.0.4/32', '10.0.0.5/32'];
const peers = [];

servers.forEach((s, i) => {
  const clientKeys = generateKeyPair();
  configs[s.id] = {
    clientPrivateKey: clientKeys.privateKey,
    clientAddress: clientAddresses[i],
    dns: '1.1.1.1, 8.8.8.8',
  };
  servers[i] = {
    ...s,
    endpoint,
    serverPublicKey: serverKeys.publicKey,
  };
  peers.push({
    publicKey: clientKeys.publicKey,
    allowedIPs: clientAddresses[i],
  });
});

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(serversFile, JSON.stringify(servers, null, 2));
fs.writeFileSync(configsFile, JSON.stringify(configs, null, 2));

const wgConf = `[Interface]
Address = 10.0.0.1/24
ListenPort = ${port}
PrivateKey = ${serverKeys.privateKey}
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

${peers.map((p) => `[Peer]
PublicKey = ${p.publicKey}
AllowedIPs = ${p.allowedIPs}
`).join('\n')}`;

console.log('✓ servers.json ve configs.json güncellendi.');
console.log('');
console.log('Sunucuda /etc/wireguard/wg0.conf dosyasına şunu ekleyin:');
console.log('---');
console.log(wgConf);
console.log('---');
console.log('');
if (serverIP === 'YOUR_SERVER_IP') {
  console.log('UYARI: Sunucu IP girin: node scripts/setup-wireguard.js 95.70.1.2');
}
