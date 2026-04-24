/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'network-packet-tunnel',
  name: 'WireGuardTunnel',
  displayName: 'WireGuard Tunnel',
  deploymentTarget: '15.1',
  // The react-native-wireguard-vpn native code expects this by default.
  bundleIdentifier: 'com.wireguardvpn.tunnel',
  frameworks: ['NetworkExtension'],
  entitlements: {
    'com.apple.developer.networking.networkextension': ['packet-tunnel-provider'],
  },
});
