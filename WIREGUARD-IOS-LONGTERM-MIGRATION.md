# WireGuard iOS Long-Term Migration

This project currently has Expo + custom Network Extension plumbing, but the extension does not include a full WireGuard backend runtime. That is why the app can appear connected while traffic does not flow.

This document defines the production-grade migration path.

## Target architecture

- React Native app keeps JS auth/server/config logic.
- iOS Packet Tunnel extension runs a real WireGuard engine (`WireGuardKit` / `wireguard-go-bridge`).
- App bridge only saves config and starts/stops tunnel.

## Why this cannot be completed fully on Windows

- iOS native project generation for this repo requires macOS/Linux tooling in current setup.
- `wireguard-apple` integration requires Xcode target wiring (Swift package + external build system target), which is Xcode-only.

## What has already been prepared in this repo

- iOS bridge config parsing hardened.
- `serverAddress` persistence and stale-preferences fixes added.
- Packet tunnel target files are present under `targets/network-packet-tunnel`.
- `appleTeamId` added in `app.json` for Apple target plugin consistency.

## Required migration steps on macOS

1. Generate native iOS project:
   - `npx expo prebuild --platform ios`
2. Open `ios/*.xcworkspace` in Xcode.
3. Add Swift Package Dependency:
   - URL: `https://git.zx2c4.com/wireguard-apple`
   - Product: `WireGuardKit`
4. Create External Build System target:
   - Name: `WireGuardGoBridgeiOS`
   - Build tool: `/usr/bin/make`
   - Directory:
     - `${BUILD_DIR%Build/*}SourcePackages/checkouts/wireguard-apple/Sources/WireGuardKitGo`
   - Set `SDKROOT=iphoneos`
5. Add target dependency and link:
   - Packet tunnel extension target depends on `WireGuardGoBridgeiOS`
   - Link `WireGuardKit` in extension target (and app target if needed by helper code)
6. Replace `PacketTunnelProvider.swift` implementation with adapter-based WireGuard startup (official pattern from `wireguard-apple`).
7. Ensure entitlements:
   - Main app and extension both signed in same team
   - `com.apple.developer.networking.networkextension` includes `packet-tunnel-provider`
8. Build and run on real iPhone.

## Validation checklist

- Tunnel connects and Safari opens websites.
- Public IP changes while connected.
- DNS resolves over VPN DNS.
- Disconnect restores normal network routes.

