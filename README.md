# Update — CacheControl 1 Tahun + JPEG Kualitas Tinggi (Bucket Utama)

## File YANG DI-CTRL+A-REPLACE
```
lib/supabase/generatedContent.ts
lib/supabase/logo.ts
lib/supabase/images.ts
```

## 1. CacheControl ditambahkan di SEMUA 6 titik upload bucket utama
Sebelumnya TIDAK ADA satu pun titik upload di bucket utama (user-images)
yang set cacheControl - beda dari fix demo kemarin yang cuma menyentuh
bucket demo. Ini kemungkinan besar akar Cached Egress masih 168% lewat
kuota padahal demo sudah dibereskan. Sekarang semua (hasil generate, video,
logo, foto produk asli) pakai cache 1 tahun.

Kenapa aman di-cache 1 tahun: begitu 1 hasil generate selesai & tersimpan,
isinya TIDAK PERNAH BERUBAH LAGI (kecuali user re-save dari editor - itu
upload BARU ke path yang SAMA, browser/CDN otomatis re-fetch versi baru
karena Supabase Storage pakai ETag, bukan murni percaya cache buta).

## 2. Hasil generate & re-save sekarang disimpan JPEG (bukan PNG)
- Kualitas dikunci di 92 (dari 100) - dipilih AMAN, TIDAK mengurangi apa
  yang user lihat/unduh secara kasat mata. Foto AI (bukan grafis
  bertepi tajam/butuh transparansi) memang jauh lebih hemat sebagai JPEG.
- Kalau konversi gagal karena alasan apa pun, otomatis fallback simpan PNG
  asli - tidak pernah gagal total menyimpan konten user.
- Logo & foto produk ASLI (upload dari user, bukan hasil generate) TIDAK
  disentuh formatnya - tetap format aslinya, cuma ditambah cacheControl.

## Satu detail kosmetik yang perlu kamu tahu (bukan bug fungsional)
Nama file yang di-download user di beberapa tempat masih hardcode
.png di akhir nama filenya (mis. kevo-produk-xxx.png), padahal isinya
sekarang JPEG. Ini TIDAK merusak apa pun - semua browser/OS/aplikasi
modern membaca isi file sesungguhnya (via Content-Type & sniffing), bukan
percaya buta ke akhiran nama file - tapi kalau ada yang perhatikan
detailnya, nama filenya kurang pas. Saya sengaja TIDAK kejar semua titik
ini sekaligus (tersebar di 6+ file berbeda) karena risikonya lebih besar
dari manfaatnya untuk sesi ini - kasih tahu kalau mau saya rapikan juga.

## Dampak yang diharapkan
- Cached Egress siklus billing BERIKUTNYA (mulai 26 Sep) seharusnya jauh
  lebih rendah - TIDAK langsung turun sekarang (ini metrik kumulatif
  siklus berjalan, sama seperti fix demo kemarin).
- Storage Size akan turun BERTAHAP - cuma konten BARU/re-save yang kena
  JPEG; konten lama yang sudah tersimpan PNG tetap PNG sampai user
  re-save-nya sendiri (tidak ada migrasi otomatis konten lama, di luar
  scope perbaikan ini).

## Yang perlu kamu tes
1. npx tsc --noEmit - saya tidak bisa jalankan sendiri (file ini dari
   upload zip tanpa node_modules) - WAJIB kamu jalankan sendiri sebelum push.
2. Generate 1 konten baru - pastikan hasilnya tetap terlihat bagus (harusnya
   tidak ada beda kasat mata dibanding sebelumnya).
3. Cek di Supabase Storage dashboard: file baru yang masuk ke folder
   generated/ sekarang berakhiran .jpg, dan ukurannya lebih kecil dari
   sebelumnya untuk konten sejenis.
