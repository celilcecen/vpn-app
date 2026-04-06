# WireGuard sunucu kurulumu (Ubuntu / VPS)

Gerçek VPN bağlantısı için bir VPS’te (DigitalOcean, Hetzner, vb.) WireGuard çalıştırmanız gerekir.

## 1. Sunucuda WireGuard kurulumu (Ubuntu)

```bash
sudo apt update
sudo apt install wireguard -y
```

## 2. Sunucu key’leri ve config

```bash
cd /etc/wireguard
sudo umask 077
sudo wg genkey | tee server_private.key | wg pubkey > server_public.key
```

`server_public.key` içeriği → backend’deki `data/servers.json` içinde her sunucu için `serverPublicKey` alanına yazılacak.

## 3. Sunucu config dosyası: `/etc/wireguard/wg0.conf`

Aşağıdaki `SERVER_PRIVATE_KEY` yerine `server_private.key` içeriğini koyun.  
Her client için bir `[Peer]` bloğu ekleyin; `CLIENT_PUBLIC_KEY` yerine o client’ın `client_public.key` içeriği gelecek.

```ini
[Interface]
Address = 10.0.0.1/24
ListenPort = 51820
PrivateKey = SERVER_PRIVATE_KEY
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
# Client 1 (örn. Türkiye sunucusu için)
PublicKey = CLIENT_PUBLIC_KEY
AllowedIPs = 10.0.0.2/32
```

`eth0` yerine sunucunuzun gerçek çıkış arayüzünü yazın (`ip a` ile kontrol edin).

## 4. Client key ve backend config

Her lokasyon (tr, de, nl, us) için:

```bash
wg genkey | tee client_private.key | wg pubkey > client_public.key
```

- `client_private.key` → backend `data/configs.json` içinde ilgili sunucu id’si altında `clientPrivateKey`.
- `client_public.key` → sunucudaki `wg0.conf` içine yeni bir `[Peer]` bloğunda `PublicKey` olarak eklenir.
- `AllowedIPs` o client’ın adresi olmalı (örn. `10.0.0.2/32`).

Backend `data/configs.json` örneği:

```json
{
  "tr": {
    "clientPrivateKey": "<client_private.key içeriği>",
    "clientAddress": "10.0.0.2/32",
    "dns": "1.1.1.1, 8.8.8.8"
  }
}
```

Backend `data/servers.json` örneği:

```json
{
  "id": "tr",
  "country": "Türkiye",
  "code": "TR",
  "ping": 8,
  "endpoint": "SUNUCU_IP:51820",
  "serverPublicKey": "<server_public.key içeriği>"
}
```

## 5. WireGuard’ı başlatma

```bash
sudo wg-quick up wg0
# Kalıcı: sudo systemctl enable wg-quick@wg0
```

## 6. Mobil uygulamada gerçek VPN

1. Backend’i yukarıdaki gibi doldurup çalıştırın.
2. Uygulama içinde API adresi: Telefon/emülatörden backend’e erişmek için `src/api/client.js` içinde `BASE_URL`’i bilgisayarınızın yerel IP’si yapın (örn. `http://192.168.1.5:3000`).
3. Gerçek tünel için uygulamada **native WireGuard** modülü gerekir:
   - `npm install wireguard-native-bridge`
   - `npx expo prebuild` (ios/android native projeleri oluşur)
   - Android: `AndroidManifest.xml` içinde VPN izni
   - iOS: Xcode’da Network Extension (Packet Tunnel) capability
   - Ardından `npx expo run:android` veya `run:ios` ile development build alın.

Expo Go ile sadece arayüz ve API testi yapılır; gerçek VPN tüneli için development build şarttır.
