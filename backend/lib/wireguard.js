const crypto = require('crypto');
const nacl = require('tweetnacl');

function clampPrivateKey(keyBuffer) {
  const key = Buffer.from(keyBuffer);
  key[0] &= 248;
  key[31] &= 127;
  key[31] |= 64;
  return key;
}

function generateWireGuardKeyPair() {
  const privateKeyRaw = clampPrivateKey(crypto.randomBytes(32));
  const publicKeyRaw = Buffer.from(nacl.scalarMult.base(new Uint8Array(privateKeyRaw)));
  return {
    privateKey: privateKeyRaw.toString('base64'),
    publicKey: publicKeyRaw.toString('base64'),
  };
}

function buildConfig({ clientPrivateKey, assignedIp, dns, serverPublicKey, endpoint, allowedIPs }) {
  const routes = allowedIPs || '0.0.0.0/0, ::/0';
  return `[Interface]
PrivateKey = ${clientPrivateKey}
Address = ${assignedIp}
DNS = ${dns || '1.1.1.1, 8.8.8.8'}

[Peer]
PublicKey = ${serverPublicKey}
Endpoint = ${endpoint}
AllowedIPs = ${routes}
PersistentKeepalive = 25
`;
}

module.exports = {
  generateWireGuardKeyPair,
  buildConfig,
};
