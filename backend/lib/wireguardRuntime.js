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

/**
 * Parse `wg show <iface> dump`.
 * First line = interface (privKey, pubKey, listenPort, fwmark).
 * Subsequent lines = peers (pubKey, presharedKey, endpoint, allowedIPs,
 * latestHandshake, rxBytes, txBytes, persistentKeepalive).
 */
function parseDump(stdout) {
  const lines = String(stdout || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return { iface: null, peers: [] };

  const ifaceParts = lines[0].split('\t');
  const iface = {
    privateKeyPresent: !!ifaceParts[0] && ifaceParts[0] !== '(none)',
    publicKey: ifaceParts[1] || null,
    listenPort: Number(ifaceParts[2]) || 0,
    fwmark: ifaceParts[3] || null,
  };

  const peers = lines.slice(1).map((l) => {
    const p = l.split('\t');
    return {
      publicKey: p[0] || '',
      presharedKey: p[1] && p[1] !== '(none)' ? p[1] : null,
      endpoint: p[2] && p[2] !== '(none)' ? p[2] : null,
      allowedIPs: p[3] || '',
      latestHandshake: Number(p[4]) || 0,
      rxBytes: Number(p[5]) || 0,
      txBytes: Number(p[6]) || 0,
      persistentKeepalive: p[7] && p[7] !== 'off' ? Number(p[7]) || 0 : 0,
    };
  });

  return { iface, peers };
}

async function getInterfaceState() {
  if (!WG_RUNTIME_ENABLED) {
    return {
      runtimeEnabled: false,
      interfaceUp: false,
      reason: 'WG_RUNTIME_ENABLED is not "true". Backend cannot manage wg peers.',
      iface: null,
      peers: [],
    };
  }
  try {
    const out = await runWg(['show', WG_INTERFACE, 'dump']);
    const parsed = parseDump(out);
    return {
      runtimeEnabled: true,
      interfaceUp: !!parsed.iface,
      iface: parsed.iface,
      peers: parsed.peers,
    };
  } catch (e) {
    return {
      runtimeEnabled: true,
      interfaceUp: false,
      reason: `wg show ${WG_INTERFACE} dump failed: ${e.message}`,
      iface: null,
      peers: [],
    };
  }
}

async function verifyPeer(publicKey) {
  const state = await getInterfaceState();
  if (!state.runtimeEnabled || !state.interfaceUp) {
    return { synced: false, latestHandshake: 0, state };
  }
  const match = state.peers.find((p) => p.publicKey === publicKey);
  return {
    synced: !!match,
    latestHandshake: match ? match.latestHandshake : 0,
    rxBytes: match ? match.rxBytes : 0,
    txBytes: match ? match.txBytes : 0,
    state,
  };
}

module.exports = {
  applyPeer,
  removePeer,
  getInterfaceState,
  verifyPeer,
  parseDump,
  WG_RUNTIME_ENABLED,
  WG_INTERFACE,
};
