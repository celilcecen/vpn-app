/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'network-packet-tunnel',
  name: 'WireGuardTunnel',
  displayName: 'WireGuard Tunnel',
  deploymentTarget: '15.1',
  // Must be unique in Apple Developer account.
  bundleIdentifier: `${config.ios.bundleIdentifier}.wireguardtunnel`,
  frameworks: ['NetworkExtension'],
  entitlements: {
    'com.apple.developer.networking.networkextension': ['packet-tunnel-provider'],
  },
});
