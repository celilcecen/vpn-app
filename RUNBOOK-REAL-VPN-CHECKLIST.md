# Real VPN Runbook

Bu dosya iki şeyi net ayırır:

1. Bu repo içinde otomatik yaptıklarımız / yapabildiklerimiz
2. Bu ortamda yapılamayıp macOS/Xcode veya canlı sunucuda yapılması gerekenler

## 1) Burada otomatik yaptıklarımız

- iOS target hazırlıkları:
  - `app.json` içinde `ios.appleTeamId`, pluginler, bundle id
  - `targets/network-packet-tunnel/*` dosyaları
- Backend güvenlik sertleştirmeleri:
  - zorunlu env kontrolleri
  - `setup/node` admin token koruması
  - `billing/webhook` secret koruması
- Backend runtime mantığı:
  - peer apply/remove (wg runtime üzerinden) altyapısı
- Frontend güvenlik:
  - production için HTTPS base URL zorlaması

## 2) Bu ortamda yapamadıklarımız (zorunlu dış adımlar)

### A) macOS + Xcode (iOS gerçek tünel)

Windows ortamında tamamlanamaz, çünkü:
- `WireGuardKit` + `WireGuardGoBridgeiOS` target wiring Xcode gerektirir.

Zorunlu adımlar:
- `npx expo prebuild --platform ios`
- Xcode'da workspace aç
- `wireguard-apple` Swift package ekle (`WireGuardKit`)
- `WireGuardGoBridgeiOS` external build target bağla
- Packet tunnel target dependency/link ayarla
- Entitlements + signing doğrula

Detaylı teknik akış: `WIREGUARD-IOS-LONGTERM-MIGRATION.md`

### B) Canlı VPN sunucusu (Linux/US host)

Bu makinede `wg` ve postgres araçları yoksa canlı doğrulama burada tamamlanamaz.

Sunucuda zorunlu kontrol:
- `wg --version`
- `wg show wg0`
- backend `.env` güncel ve secretlar set
- backend servis restart
- `curl http://127.0.0.1:3000/health`

## 3) Tek komut preflight

Repo kökünde:

```bash
npm run preflight
```

Bu komut:
- kritik app/backend dosyalarını
- env anahtarlarını
- yerel araç uygunluğunu (wg/psql/xcodebuild) raporlar.

## 4) Canlı doğrulama sırası (TR -> US)

1. Sunucuda backend ayağa kalksın (`/health` OK).
2. `setup/node` ile US endpoint/public key güncel olsun.
3. Uygulamadan login + connect (US ONLY).
4. Sunucuda `wg show wg0 peers` ile peer görünmeli.
5. iPhone'da public IP + DNS leak testi ile US çıkış doğrulanmalı.
