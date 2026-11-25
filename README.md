# Kütüphane Düzenleyici

Kitabın barkodunu telefonla okut, kütüphaneni numarala, QR etiketle, Excel'e aktar.

Telefon öncelikli web uygulaması (ana ekrana eklenebilir). Veriler kullanıcının kendi telefonunda saklanır; hesap yok.

## Yapı

- `src/modules/` — ekrandan bağımsız iş mantığı (saklama, numaralama, yer, ISBN)
- `src/components/` — birden fazla ekranın kullandığı parçalar (yer düzenleyici)
- `src/screens/` — her ekran ayrı dosyada
- `tests/` — otomatik kontroller

## Komutlar

```
npm install
npm run dev     # geliştirme sunucusu
npm test        # otomatik kontroller
npm run build   # yayına hazır dosyalar (dist/)
```

Yayın: Vercel, GitHub'a her kayıtta otomatik.
