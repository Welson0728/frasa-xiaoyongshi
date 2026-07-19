# Jom Main Bahasa!

Permainan web responsif Bahasa Melayu Tahun 2 yang meliputi kemahiran mendengar, membaca, sistem bahasa, menyusun ayat, menulis pada skrin dan membaca secara lisan. Kandungan dipilih daripada buku teks dan disemak terhadap DSKP sehingga Tahap Penguasaan 4.

Audio murid menggunakan fail MP3 tetap daripada satu suara `ms-MY-YasminNeural` pada kadar `-15%`. Nama suara hanya disimpan dalam dokumentasi pembinaan dan tidak dipaparkan dalam antara muka murid. Tiada suara pelayar atau suara gantian dibenarkan.

Murid boleh memilih laluan `Dengar`, `Baca` atau `Tulis`, atau memilih cabaran campuran. Laluan `Baca` merakam suara, menyediakan butang main semula yang jelas dan menggunakan pengecaman pertuturan `ms-MY` pada pelayar yang menyokongnya. Bacaan yang tidak sepadan tidak boleh disahkan sendiri sebagai betul. Untuk penilaian pertuturan dan tulisan yang seragam pada semua pelayar, tetapkan `NEXT_PUBLIC_ASSESS_API_BASE` kepada perkhidmatan penilaian selamat; kunci API tidak boleh disimpan dalam laman GitHub Pages.

Dalam aktiviti susun ayat, nama berbilang perkataan seperti `Guan Hong`, `Zhi Ying` dan `Cikgu Wong` dikekalkan sebagai satu token.

## Laman permainan

https://welson0728.github.io/frasa-xiaoyongshi/

## Benamkan dengan iframe

```html
<iframe
  src="https://welson0728.github.io/frasa-xiaoyongshi/"
  title="Jom Main Bahasa!"
  loading="lazy"
  allow="microphone; autoplay; fullscreen"
  style="width:100%;height:90dvh;min-height:680px;border:0;border-radius:18px;"
></iframe>
```

## Jalankan secara tempatan

```bash
npm install
npm run dev
```
