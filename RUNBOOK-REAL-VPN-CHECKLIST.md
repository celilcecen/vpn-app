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

## 5) "VPN açıldı görünüyor ama internet yok" — sunucu tarafında 5 dakikada teşhis

Bu en sık yaşanan hata. App `Protection Active` der ama trafik akmaz. Sebep neredeyse her zaman: **peer DB'ye yazıldı, kernel `wg0`'a yazılmadı**.

SSH'la sunucuya gir ve sırasıyla:

```bash
# 1) wg arayüzü canlı mı?
ip a show wg0 || sudo wg-quick up wg0

# 2) wg üstünde tanımlı public key bizim DB'dekiyle aynı mı?
sudo wg show wg0 | head -3
psql "$DATABASE_URL" -c "SELECT id, server_public_key FROM vpn_nodes;"
# server'ın "public key" satırı, "server_public_key" sütunlarıyla EŞLEŞMELİ

# 3) backend env'de WG_RUNTIME_ENABLED=true var mı?
sudo systemctl show <backend-service> -p Environment | tr ' ' '\n' | grep -i WG_
# çıktıda WG_RUNTIME_ENABLED=true GÖRÜNMELI

# 4) backend süreci `wg set` çağırabiliyor mu?
sudo -u <backend-user> wg show wg0
# permission denied derse: backend'i ya root olarak çalıştır,
# ya da `sudo setcap cap_net_admin+ep $(which wg)` (sınırlı işe yarar; en iyisi
# systemd unit'ine `AmbientCapabilities=CAP_NET_ADMIN` + `CapabilityBoundingSet=CAP_NET_ADMIN`)

# 5) Telefondan bağlandıktan sonra peer kernelde görünüyor mu?
sudo wg show wg0
# `latest handshake: X seconds ago` çıkıyorsa handshake gerçekleşmiş.
# çıkmıyor ve hep `0 received, 0 sent` ise: ya peer kernelde yok,
# ya da UDP/51820 erişilemiyor (AWS SG / firewall kontrol et).

# 6) UDP 51820 dünyaya açık mı?
sudo ss -ulnp | grep 51820
# AWS Security Group: Inbound UDP 51820 source 0.0.0.0/0 olmalı.

# 7) IP forwarding ve NAT yapılı mı? (yoksa tunnel açılır ama internet çıkışı olmaz)
sysctl net.ipv4.ip_forward    # 1 olmalı
sudo iptables -t nat -L POSTROUTING -n
# `MASQUERADE  all  --  10.50.0.0/24  0.0.0.0/0` satırına benzer kayıt olmalı
# yoksa: sudo iptables -t nat -A POSTROUTING -s 10.50.0.0/24 -o eth0 -j MASQUERADE
```

Yeni eklenen tanı endpointleri (backend pull/restart ettikten sonra):

```bash
# Hızlı durum (auth gerektirmez)
curl -s https://api.guardline.online/setup/runtime | jq

# Tam diag (admin token gerekir; .env'deki ADMIN_SETUP_TOKEN)
curl -s -H "x-admin-token: $ADMIN_SETUP_TOKEN" \
  https://api.guardline.online/setup/diag | jq
```

Beklenen "sağlıklı" çıktı:

```json
{
  "wgRuntimeEnabled": true,
  "wgInterface": "wg0",
  "interfaceUp": true,
  "activePeers": <kernelde gerçek peer sayısı>,
  "reason": null
}
```

App tarafı: Settings ekranında `RUN DIAGNOSTICS` butonu aynı bilgileri telefondan da göstereceğine.
