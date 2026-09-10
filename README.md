# Update — Perbaikan 24 Error TypeScript Lama (Pre-existing)

Ini paket khusus untuk 24 error tsc yang muncul di screenshot-mu — SEMUANYA
di file yang tidak pernah saya sentuh sebelum sesi pembersihan ini (terbukti
lewat git status, tidak ada di daftar modified/untracked sebelumnya).

## File YANG DI-CTRL+A-REPLACE (12 file)
```
__tests__/autoContentPrompt.test.ts
__tests__/captionPrompt.test.ts
__tests__/scenePrompt.test.ts
__tests__/businessProfile.test.ts
__tests__/supabaseBusinessProfile.test.ts
__tests__/businessLogoRemoveBackgroundRoute.test.ts
__tests__/businessLogoRoute.test.ts
app/auth/confirm/route.ts
app/video/cerita/page.tsx
app/video/page.tsx
app/videocerita/page.tsx
app/videocerita/singkat/page.tsx
```

## Ringkasan perbaikan per kategori

1. **Mock profil bisnis di test kurang field** (`customerTypes`, `logoLight`)
   — field ini ditambahkan ke tipe `BusinessProfile` di masa lalu, tapi
   beberapa file test lama tidak pernah diupdate. Tinggal tambah field yang
   hilang ke object literal mock-nya.

2. **`POST()`/`DELETE()` dipanggil tanpa argumen di test** — route
   `business-logo` dan `business-logo/remove-background` sudah diupgrade
   untuk butuh `request` (baca body/URL), tapi test lama masih manggil
   fungsinya tanpa argumen. Ditambahkan helper `mockRequest()`/
   `mockDeleteRequest()` kecil di masing-masing file test.

3. **Parameter implicit `any`** di `app/auth/confirm/route.ts` — 2 tempat
   destructuring (`{ name, value, options }` dan `{ name, value }`) belum
   punya anotasi tipe eksplisit. Ditambahkan tipe manual.

4. **Import ffmpeg dinamis (`webpackIgnore`) bikin `tsc` bingung** — 4 file
   video yang sengaja pakai `import(/* webpackIgnore: true */ "...")` untuk
   load ffmpeg.wasm saat runtime (bukan di-bundle). `tsc` tetap coba resolve
   tipe-nya dan gagal. Ditambahkan `// @ts-expect-error` tepat di atas baris
   string-nya (posisi ini penting — sempat saya taruh salah tempat di
   percobaan pertama, sekarang sudah benar).

## PENTING — verifikasi di komputermu sendiri
Sandbox saya TIDAK punya `node_modules` project ini terpasang (react, vitest,
@supabase/supabase-js, dll semuanya "Cannot find module" di sisi saya) —
jadi saya tidak bisa 100% memastikan hasil akhirnya bersih total tanpa kamu
jalankan sendiri:

```powershell
npx tsc --noEmit
```

Kalau MASIH ada error setelah pasang 12 file ini, kemungkinan besar itu
error BARU yang baru kelihatan setelah 24 yang lama dibereskan (pola ini
sudah terjadi 1x tadi — `logoLight` ketahuan setelah `customerTypes`
dibereskan duluan) — kirim saya screenshot/teks errornya, saya lanjutkan.

## Setelah bersih total
Baru lanjut ke urutan push yang sudah dibahas sebelumnya:
```powershell
git status
git diff --stat
git add -A
git commit -m "Perbaikan judul, cleanup Supabase, ganti ikon, edit profil bisnis, onboarding, animasi, dan 24 error TypeScript lama"
git push
```
