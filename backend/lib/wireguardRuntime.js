const { execFile } = require('child_process');

const WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';
const WG_BIN = process.env.WG_BIN || 'wg';
const WG_RUNTIME_ENABLED = process.env.WG_RUNTIME_ENABLED === 'true';

function runWg(args) {
  return new Promise((resolve, reject) => {
    execFile(WG_BIN, args, { timeout: 15000 }, (error, stdout, stderr) => {
      if (error) {
        const reason = stderr || stdout || error.message;
        reject(new Error(`wg command failed: ${reason}`));
        return;
      }
      resolve(stdout);
    });
  });
}

async function applyPeer({ publicKey, assignedIp }) {
  if (!WG_RUNTIME_ENABLED) return;
  if (!publicKey || !assignedIp) {
    throw new Error('MISSING_PEER_RUNTIME_PARAMS');
  }
  await runWg(['set', WG_INTERFACE, 'peer', publicKey, 'allowed-ips', assignedIp]);
}

async function removePeer({ publicKey }) {
  if (!WG_RUNTIME_ENABLED) return;
  if (!publicKey) {
    throw new Error('MISSING_PEER_PUBLIC_KEY');
  }
  await runWg(['set', WG_INTERFACE, 'peer', publicKey, 'remove']);
}

module.exports = {
  applyPeer,
  removePeer,
  WG_RUNTIME_ENABLED,
  WG_INTERFACE,
};
