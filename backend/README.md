# VPN Backend API

Bu backend, VPN uygulaması için:
- kullanıcı kayıt/giriş,
- abonelik doğrulaması,
- cihaz bazlı WireGuard config üretimi,
- node (ülke sunucusu) yönetimi sağlar.

## Kurulum

```bash
cd backend
npm install
cp .env.example .env
# .env: JWT_SECRET ve DATABASE_URL değerlerini ayarlayın
npm start
```

API: `http://localhost:3000`

## Kritik Not

`DATABASE_URL` zorunludur. Backend açılışta tabloları otomatik oluşturur ve
`data/servers.json` ile `data/users.json` içeriğini ilk kurulumda PostgreSQL'e aktarır.

## Endpoint'ler

- `POST /auth/register` – Kayıt (email, password) ve varsayılan aktif abonelik
- `POST /auth/login` – Giriş (email, password) → token döner
- `GET /servers` – Aktif node listesi (id, country, code, ping)
- `POST /vpn/config` – Cihaz bazlı WireGuard config
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "serverId": "tr", "deviceId": "iphone-15", "platform": "ios" }`
- `POST /setup/node` – Node ekle/güncelle
  - Body: `{ "id","country","code","endpoint","serverPublicKey","ping","capacity" }`
- `GET /setup/status` – Aktif node/peer durumu
- `POST /billing/webhook` – Abonelik durum güncelleme
  - Body: `{ "email": "user@mail.com", "status": "active|canceled|past_due", "provider": "stripe" }`

## WireGuard Akışı

- Her kullanıcı+cihaz+ülke için benzersiz peer üretilir.
- Peer ilk istekte oluşturulur, sonraki isteklerde aynı peer yeniden kullanılır.
- IP ataması otomatik yapılır (örn. `10.50.0.x/32`).
- Kullanıcı pasif aboneliğe düşerse peer durumları `revoked` olur.
