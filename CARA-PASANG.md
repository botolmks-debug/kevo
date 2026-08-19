# Maintenance Mode + Hapus Logo Bisnis dari Edit Konten

## 1. SQL — jalankan di Supabase SQL Editor
Paste isi `supabase-app_settings.sql` → Run

## 2. File yang ditimpa/ditambah:
- proxy.ts                              → cek maintenance, redirect + logout non-admin
- app/konten/page.tsx                   → Logo Bisnis dihapus dari Edit Konten
- app/admin/page.tsx                    → tambah tombol toggle maintenance
- app/admin/MaintenanceToggle.tsx       → komponen baru (client)
- app/api/admin/maintenance/route.ts   → API toggle (baru)
- app/maintenance/page.tsx             → halaman maintenance (baru)

## 3. Git
git add proxy.ts app/konten/page.tsx app/admin/page.tsx \
  app/admin/MaintenanceToggle.tsx \
  app/api/admin/maintenance/route.ts \
  app/maintenance/page.tsx
git commit -m "feat: maintenance mode + hapus logo bisnis dari edit konten"
git push

## Cara pakai
- Admin → keposting.com/admin → "Aktifkan Maintenance"
- User biasa yang login → di-logout → diarahkan ke /maintenance
- User yang belum login → /login dialihkan ke /maintenance
- Admin (botolmks@gmail.com) tidak terpengaruh sama sekali
- Nonaktifkan: klik tombol yang sama → aplikasi normal kembali
