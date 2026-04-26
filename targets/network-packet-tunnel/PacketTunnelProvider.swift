import Foundation
import NetworkExtension
import WireGuardKit
import os

final class PacketTunnelProvider: NEPacketTunnelProvider {
  private let logger = Logger(subsystem: "com.celilcecen.guardlanevpn.wireguardtunnel", category: "PacketTunnel")

  private lazy var adapter: WireGuardAdapter = {
    WireGuardAdapter(with: self) { [weak self] logLevel, message in
      self?.logger.log("WG[\(logLevel.rawValue)]: \(message, privacy: .public)")
    }
  }()

  override func startTunnel(
    options: [String: NSObject]?,
    completionHandler: @escaping (Error?) -> Void
  ) {
    do {
      let tunnelConfiguration = try makeTunnelConfiguration(from: protocolConfiguration)
      adapter.start(tunnelConfiguration: tunnelConfiguration) { adapterError in
        if let adapterError = adapterError {
          completionHandler(adapterError)
        } else {
          completionHandler(nil)
        }
      }
    } catch {
      completionHandler(error)
    }
  }

  override func stopTunnel(
    with reason: NEProviderStopReason,
    completionHandler: @escaping () -> Void
  ) {
    adapter.stop { _ in
      completionHandler()
    }
  }

  // MARK: - Tunnel configuration builder

  private func makeTunnelConfiguration(from proto: NEVPNProtocol?) throws -> TunnelConfiguration {
    guard let proto = proto as? NETunnelProviderProtocol else {
      throw PTPError.invalidProtocol
    }

    guard let cfg = proto.providerConfiguration else {
      throw PTPError.missingProviderConfiguration
    }

    let privateKeyBase64 = try requiredString("privateKey", in: cfg)
    let address = try requiredString("address", in: cfg)
    let publicKeyBase64 = try requiredString("publicKey", in: cfg)
    let endpointString = try requiredString("endpoint", in: cfg)
    let allowedIPs = stringArray("allowedIPs", in: cfg) ?? ["0.0.0.0/0", "::/0"]
    let dnsStrings = stringArray("dns", in: cfg) ?? ["1.1.1.1", "8.8.8.8"]
    let mtu = number("mtu", in: cfg).map { UInt16($0) }
    let keepAlive = number("persistentKeepalive", in: cfg).map { UInt16($0) } ?? 25

    guard let privateKey = PrivateKey(base64Key: privateKeyBase64) else {
      throw PTPError.invalidField("privateKey")
    }
    guard let serverPublicKey = PublicKey(base64Key: publicKeyBase64) else {
      throw PTPError.invalidField("publicKey")
    }
    guard let endpoint = Endpoint(from: endpointString) else {
      throw PTPError.invalidField("endpoint")
    }

    var interface = InterfaceConfiguration(privateKey: privateKey)
    guard let addressRange = IPAddressRange(from: address) else {
      throw PTPError.invalidField("address")
    }
    interface.addresses = [addressRange]
    interface.dns = dnsStrings.compactMap { DNSServer(from: $0) }
    interface.mtu = mtu

    var peer = PeerConfiguration(publicKey: serverPublicKey)
    peer.endpoint = endpoint
    peer.allowedIPs = allowedIPs.compactMap { IPAddressRange(from: $0) }
    peer.persistentKeepAlive = keepAlive

    return TunnelConfiguration(
      name: proto.serverAddress ?? "GuardLine",
      interface: interface,
      peers: [peer]
    )
  }

  // MARK: - Helpers

  private func requiredString(_ key: String, in dict: [String: Any]) throws -> String {
    guard let v = dict[key] as? String,
          !v.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      throw PTPError.invalidField(key)
    }
    return v
  }

  private func stringArray(_ key: String, in dict: [String: Any]) -> [String]? {
    if let a = dict[key] as? [String] { return a }
    if let a = dict[key] as? [Any] { return a.compactMap { $0 as? String } }
    if let s = dict[key] as? String {
      return s
        .split(whereSeparator: { $0 == "," || $0 == " " })
        .map { String($0) }
        .filter { !$0.isEmpty }
    }
    return nil
  }

  private func number(_ key: String, in dict: [String: Any]) -> Int? {
    if let n = dict[key] as? Int { return n }
    if let n = dict[key] as? NSNumber { return n.intValue }
    if let s = dict[key] as? String, let i = Int(s) { return i }
    return nil
  }
}

private enum PTPError: LocalizedError {
  case invalidProtocol
  case missingProviderConfiguration
  case invalidField(String)

  var errorDescription: String? {
    switch self {
    case .invalidProtocol: return "Invalid NETunnelProviderProtocol"
    case .missingProviderConfiguration: return "Missing providerConfiguration"
    case .invalidField(let key): return "Invalid or missing field: \(key)"
    }
  }
}
