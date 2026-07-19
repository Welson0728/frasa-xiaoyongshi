# Jom Main Bahasa!

Permainan web responsif Bahasa Melayu Tahun 2 yang meliputi kemahiran mendengar, membaca, sistem bahasa, menyusun ayat, menulis pada skrin dan membaca secara lisan. Kandungan dipilih daripada buku teks dan disemak terhadap DSKP sehingga Tahap Penguasaan 4.

Audio murid menggunakan fail MP3 tetap daripada satu suara `ms-MY-YasminNeural` pada kadar `-15%`. Nama suara hanya disimpan dalam dokumentasi pembinaan dan tidak dipaparkan dalam antara muka murid. Tiada suara pelayar atau suara gantian dibenarkan.

Murid boleh memilih laluan `Dengar`, `Baca` atau `Tulis`, atau memilih cabaran campuran 10/15 soalan dengan markah dan pecahan kemahiran. Laluan `Dengar` merangkumi pilihan, susunan, isi tempat kosong dan padanan audio. Laluan `Baca` merakam suara, menyediakan butang main semula yang jelas dan menggunakan pengecaman pertuturan `ms-MY` pada pelayar yang menyokongnya. Chromium 135 dan lebih baharu menghantar audio daripada trek mikrofon yang sama kepada rakaman dan pengecaman untuk mengelakkan perebutan mikrofon pada Android. Sesi pengecaman yang tamat awal semasa rakaman akan disambung semula secara automatik. Semua perkataan mesti sepadan mengikut urutan untuk lulus; satu perkataan yang salah, tertinggal atau ditambah tidak boleh mendapat pengesahan 100%.

Tulisan dinilai pada peranti dengan panduan jejak bentuk huruf. Setiap huruf mesti diliputi, manakala contengan, tulisan tambahan, garisan di luar sasaran dan jumlah pen berlebihan akan ditolak. Maklum balas khusus dipaparkan terus. Untuk penilaian pertuturan atau OCR tulisan bebas yang seragam pada semua pelayar, `NEXT_PUBLIC_ASSESS_API_BASE` boleh disambungkan kepada perkhidmatan penilaian selamat; kunci API tidak boleh disimpan dalam laman GitHub Pages.

Saluran laporan cabaran telah disediakan tetapi tidak aktif secara lalai. Tetapkan `NEXT_PUBLIC_REPORT_ENDPOINT` untuk menerima keputusan JSON dan/atau `NEXT_PUBLIC_REPORT_DASHBOARD_URL` untuk memaparkan pautan laporan. Tanpa tetapan itu, tiada butang laporan, akaun atau penyimpanan data dipaparkan kepada murid.

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

<!-- deployment: mobile-handwriting -->
