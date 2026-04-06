# Gerçek VPN için Development Build

Expo Go gerçek VPN (WireGuard) desteklemez. **Development build** almanız gerekir.

## iPhone (iOS) için

### EAS Build ile (Önerilen – Mac gerekmez)

1. **Expo hesabı:** https://expo.dev
2. **EAS CLI:** `npm install -g eas-cli`
3. **Giriş:** `eas login`
4. **iOS build:** `eas build --platform ios --profile preview`

Build tamamlanınca **TestFlight** veya **ad-hoc** ile iPhone’a yükleyebilirsiniz.

**Not:** Apple Developer hesabı ($99/yıl) gerekir.

---

## Android için

### EAS Build

```bash
eas build --platform android --profile preview
```

APK indirme linki verilir; telefona yükleyin.

### Yerel build (Android Studio + Java)

1. Android Studio ve Java JDK 17 kurun
2. `JAVA_HOME` ayarlayın
3. `npx expo run:android` (cihaz/emülatör bağlı olmalı)

---

## Yapılandırma (app.json)

- **iOS:** `bundleIdentifier: com.vpn.app`, `buildNumber`, `infoPlist`
- **Android:** `package: com.vpn.app`
- **EAS:** `eas.json` – preview ve production profilleri

---

**Not:** `wireguard-native-bridge` şu an **Android** için tam destekli. iOS’ta VPN henüz tam uyumlu olmayabilir; EAS Build ile deneyebilirsiniz.
