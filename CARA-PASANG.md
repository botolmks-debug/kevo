# Halaman Demo Iklan /coba — Cara Pasang

Ekstrak isi folder ini ke ROOT project Keposting.

## 1. Buat tabel di Supabase
- Supabase -> SQL Editor -> New query -> tempel isi `supabase-demo_leads.sql` -> Run

## 2. Buat bucket PUBLIC untuk hasil demo
- Supabase -> Storage -> New bucket
- Nama: demo-results
- Centang "Public bucket" -> Save
(Hasil demo disimpan di sini supaya bisa tampil di layar & dikirim via email.)

## 3. Salin berkas (sudah pada posisinya di ZIP)
- app/coba/page.tsx           <- halaman (versi final)
- app/coba/layout.tsx         <- layout polos (buang bulatan "N")
- app/api/demo-generate/route.ts
- app/api/demo-send/route.ts
- lib/demo/validateEmail.ts
- lib/demo/generate.ts        <- SUDAH disambung ke mesin generate asli

## 4. Pastikan env sudah ada (kemungkinan sudah semua)
- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM
- (env Gemini yang biasa dipakai generate-auto)

## 5. Tes
- npm run dev
- buka http://localhost:3000/coba
- upload foto -> pilih tipe bisnis -> isi email -> Buat kontenku
- kalau ada error import path, sesuaikan alias "@/..." dengan struktur aslimu

## Cara kerja generate (sudah disambung)
lib/demo/generate.ts memakai helper ASLI:
  editImage + generateJsonContent + buildProdukContentPrompt +
  buildFood/Skincare/ScenePrompt + renderTemplate(polosTemplate)
Flow = "produk": EDIT foto asli pengunjung -> hasil = produk asli.

## CAVEAT (baca ini)
- Demo TIDAK menganalisis foto per-gambar (pengunjung anonim), jadi caption
  lebih GENERIK (tidak mengutip detail produk). Kualitas gambar tetap dari
  foto asli. Upgrade opsional: colok helper analisis gambarmu supaya dapat
  "description" -> caption jadi spesifik. Kirim file analisisnya ke Claude.
- Gambar demo pakai polosTemplate TANPA logo user (memang demo).

## Pagar yang sudah tertanam
- 1 email = 1 percobaan (dicek sebelum generate)
- Cap harian 50 demo (rem biaya ~Rp33rb/hari worst case) -> ubah DEMO_DAILY_CAP
- Tolak email format salah + domain sampah/disposable
- Hasil dikirim ke email = penyaring email palsu alami

## Opsional tapi disarankan
- Rename file logo tanpa spasi: public/Logo/logo keposting.png
  -> public/logo/logo-keposting.png, sesuaikan src di page.tsx
  (spasi & huruf besar bisa bikin logo tak muncul di Vercel)
