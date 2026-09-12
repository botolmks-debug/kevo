# Update — Panorama Dibagi 2 (bukan 3) — Signifikan Kurangi Bantalan

## File YANG DI-CTRL+A-REPLACE
```
lib/ai/carouselPrompt.ts
lib/images/splitPanorama.ts
app/api/generate-carousel/route.ts
```
(splitPanorama.ts ditulis ulang total - timpa penuh.)
(CarouselAuto.tsx TIDAK berubah dari paket sebelumnya - jumlah slide tetap
3 total, cuma cara membaginya yang berubah di balik layar.)

## Kenapa balik ke bagi 2 (bukan 3)
Screenshot yang kamu kirim menunjukkan bantalan masih ada - artinya ukuran
custom "3240x1080" kemungkinan besar DITOLAK server, jatuh ke fallback
resmi "1536x1024". Saya hitung ulang matematikanya untuk skenario fallback
ini khusus:
- Dibagi 3 (versi sebelumnya): cuma 50% sisi kotak terisi konten
- Dibagi 2 (versi ini): 75% sisi kotak terisi konten - JAUH lebih baik

## Perubahan desain
Slide ke-3 (produk) SEKARANG TIDAK LAGI diambil dari "bagian panorama yang
disisakan kosong" (pendekatan lama, butuh instruksi rumit ke AI). Sekarang
dibuat lewat langkah TERPISAH yang PERSIS SAMA dengan mode carousel lain
(foto produk asli + bagian terakhir panorama sebagai referensi gaya) -
lebih sederhana, reuse kode yang sudah ada, dan MEMBEBASKAN panorama untuk
cuma perlu 2 bagian (bukan 3), yang secara matematis jauh lebih
menguntungkan kalau fallback yang terpakai.

## Bonus: kasus ukuran custom BERHASIL juga lebih baik sekarang
Kalau server ternyata MENERIMA "3240x1080": dibagi 2 = 1620px per bagian,
SEDIKIT lebih lebar dari kotak 1080 - sekarang di-crop dikit (bukan
disusutkan/pad seperti bug yang saya perbaiki di kode ini juga), hasilnya
tetap resolusi penuh dengan potongan minor di kiri-kanan. Jauh lebih baik
daripada skenario dibagi 3 (yang kalau custom size berhasil pun bagi 3
sudah pas, tapi kalau GAGAL jadi buruk - bagi 2 lebih tahan-banting di
kedua skenario).

## Yang perlu kamu tes
1. npx tsc --noEmit - sudah bersih.
2. Generate ulang mode Panorama - bandingkan langsung ke screenshot yang
   kamu kirim: apakah bantalannya sekarang jelas lebih tipis (mendekati
   proporsi 75% konten vs sebelumnya 50%)?
3. Cek produk di slide 3 masih muncul benar (logika edit-nya sekarang
   generic/sama seperti mode lain, harusnya tidak berubah perilakunya).
