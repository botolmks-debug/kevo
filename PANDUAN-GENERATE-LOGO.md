# Fitur Generate Logo Otomatis — SUDAH TERPASANG

Beda dari draft pertama: kali ini kodenya sudah dicocokkan langsung ke file
asli project kamu (tokens.ts, businessProfile.ts, logo.ts, geminiImage.ts),
bukan tebakan lagi. Tombolnya juga sudah saya pasang di LogoSettings.tsx —
tidak perlu edit manual lagi, tinggal jalankan migration.

## Yang WAJIB dilakukan sebelum jalan

1. Jalankan migration di Supabase SQL Editor:
   `migrations/generate-logo.sql`
   ```sql
   alter table business_profile
     add column if not exists logo_free_generate_used boolean not null default false;
   ```
2. Extract ZIP ini ke root project (timpa/replace file yang sama).
3. Restart dev server (`npm run dev`), buka `/gambar` → kartu "Belum punya
   logo?" muncul di atas 2 kartu Logo Gelap/Terang.

## File yang diubah/ditambah (final)

- BARU `migrations/generate-logo.sql`
- BARU `lib/ai/logoPrompt.ts` — prompt dari `business.name/industry`,
  `positioning.differentiator/tone`, `offering.flagshipProduct`
- BARU `app/api/generate-logo/route.ts` — pakai `generateImage()` dari
  `lib/ai/geminiImage.ts` (model + fallback OpenAI otomatis ikut yang sudah
  ada), `removeChromaBackground()`, `uploadLogo()` dari `lib/supabase/logo.ts`
  (dark & light), `consumeToken`/`refundToken` dari `lib/supabase/tokens.ts`
- BARU `components/dashboard/GenerateLogoButton.tsx` — pakai komponen
  `Button` yang sama dengan tombol lain di app
- DIUBAH `app/dashboard/LogoSettings.tsx` — tambah 1 import + 1 baris
  render `<GenerateLogoButton onSaved={loadLogos} hasExistingLogo={...} />`
  (2 baris ini yang berubah, sisanya persis file lama kamu)

## Cara kerja

1. Prompt dibangun dari onboarding, minta AI gambar logo simpel di atas
   **latar magenta solid** (`generateImage`, aspect ratio 1:1).
2. Latar magenta dihapus via `removeChromaBackground` (fungsi yang sama
   dipakai `remove-background` foto produk) → PNG transparan versi "gelap".
3. Versi "terang" dibuat DARI alpha channel logo gelap (semua piksel
   non-transparan → putih solid) — bukan generate AI kedua, jadi bentuknya
   identik & tidak nambah biaya AI.
4. Kedua PNG disimpan lewat `uploadLogo()` (variant `dark` & `light`) — ini
   otomatis menghapus file logo lama & update kolom di `business_profile`,
   sama seperti upload manual.
5. Generate pertama gratis (cek kolom `logo_free_generate_used`), generate
   berikutnya potong 1 token via `consumeToken`. Kalau generate/proses gagal
   di tengah jalan, token dikembalikan otomatis (`refundToken`) — user tidak
   rugi token untuk hasil yang gagal.
6. Tombol tetap muncul walau sudah ada logo (label berubah jadi "Generate
   Ulang (1 token)") — sesuai permintaan awal: boleh generate berkali-kali.

## Belum ditangani (opsional, kalau mau lanjut nanti)

- Tidak ada tahap approve-dulu-sebelum-simpan — begitu generate berhasil,
  langsung tersimpan jadi logo aktif (menimpa yang lama). Kalau mau ada
  jeda "Simpan / Batal", perlu ubah alur jadi 2 langkah (generate → preview
  di state lokal → baru panggil endpoint simpan terpisah).
- Belum ada validasi otomatis kalau AI salah eja nama usaha di logo (perlu
  cek manual dari hasil gambar).

## Belum saya tes jalan (tsc/build)
Tidak ada node_modules di ZIP yang kamu kirim, jadi saya tidak bisa jalankan
`tsc`/build di sini untuk verifikasi akhir. Tolong jalankan `npx tsc --noEmit`
atau langsung tes di localhost setelah extract — kalau ada error tipe,
kirim pesan errornya ke saya.
