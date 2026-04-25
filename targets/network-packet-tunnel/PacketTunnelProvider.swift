import NetworkExtension

/// Packet tunnel entry point. Must apply network settings; a no-op startTunnel breaks iOS VPN.
class PacketTunnelProvider: NEPacketTunnelProvider {
  override func startTunnel(options: [String: NSObject]?, completionHandler: @escaping (Error?) -> Void) {
    guard let proto = protocolConfiguration as? NETunnelProviderProtocol else {
      completionHandler(
        NSError(
          domain: "GuardLine",
          code: 1,
          userInfo: [NSLocalizedDescriptionKey: "Invalid VPN configuration"]
        )
      )
      return
    }

    var remote = proto.serverAddress ?? ""
    if remote.isEmpty, let cfg = proto.providerConfiguration as? [String: Any] {
      if let s = cfg["serverAddress"] as? String { remote = s }
    }
    if remote.isEmpty {
      completionHandler(
        NSError(
          domain: "GuardLine",
          code: 2,
          userInfo: [NSLocalizedDescriptionKey: "Missing server address"]
        )
      )
      return
    }

    let tunnelRemote: String
    if remote.hasPrefix("[") {
      if let endIdx = remote.firstIndex(of: "]") {
        tunnelRemote = String(remote[remote.index(after: remote.startIndex)..<endIdx])
      } else {
        tunnelRemote = remote
      }
    } else if let colon = remote.lastIndex(of: ":"),
              !remote[..<colon].contains(":") {
      tunnelRemote = String(remote[..<colon])
    } else {
      tunnelRemote = remote
    }

    let settings = NEPacketTunnelNetworkSettings(tunnelRemoteAddress: tunnelRemote)

    var tunnelIp = "10.64.0.2"
    if let cfg = proto.providerConfiguration as? [String: Any],
       let addr = cfg["address"] as? String {
      let host = addr.split(separator: "/").first.map(String.init) ?? addr
      if !host.isEmpty { tunnelIp = host }
    }

    let ipv4 = NEIPv4Settings(addresses: [tunnelIp], subnetMasks: ["255.255.255.255"])
    ipv4.includedRoutes = [NEIPv4Route.default()]
    settings.ipv4Settings = ipv4

    if let cfg = proto.providerConfiguration as? [String: Any],
       let dnsAny = cfg["dns"] {
      var servers: [String] = []
      if let arr = dnsAny as? [String] {
        servers = arr
      } else if let arr = dnsAny as? [Any] {
        servers = arr.compactMap { $0 as? String }
      }
      if !servers.isEmpty {
        settings.dnsSettings = NEDNSSettings(servers: servers)
      }
    }
    if settings.dnsSettings == nil {
      settings.dnsSettings = NEDNSSettings(servers: ["1.1.1.1"])
    }

    if let cfg = proto.providerConfiguration as? [String: Any],
       let mtuVal = cfg["mtu"] {
      if let n = mtuVal as? NSNumber {
        settings.mtu = n
      } else if let i = mtuVal as? Int {
        settings.mtu = NSNumber(value: i)
      }
    }
    if settings.mtu == nil {
      settings.mtu = NSNumber(value: 1280)
    }

    setTunnelNetworkSettings(settings, completionHandler: completionHandler)
  }

  override func stopTunnel(with reason: NEProviderStopReason, completionHandler: @escaping () -> Void) {
    completionHandler()
  }
}
