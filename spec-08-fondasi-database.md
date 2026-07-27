# Spec Irisan 08 — Fondasi Database + Database Gambar Dasar

Serahkan ke Claude Code. Patuhi `CLAUDE.md`. **Ini menyentuh database — kerjakan
dengan mode manual approve, jangan auto.**

---

## PRASYARAT (tugas pemilik, BUKAN agen)

Supabase harus tersambung dulu. Pemilik menyiapkan `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=<Project URL Supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Publishable key Supabase>
```
(Project "Kevo" sudah dibuat sebelumnya. Ambil URL dari Settings→General, dan
Publishable key dari Settings→API Keys.)

**Agen:** JANGAN sentuh `.env.local`. Pakai lewat client Supabase yang sudah ada
di kerangka (spec-00). Kalau env belum ada, beri pesan jelas, jangan crash.

---

## Tujuan

Buat **fondasi data yang permanen**: sambungkan Supabase, buat struktur tabel,
siapkan penyimpanan file gambar, lalu pindahkan penyimpanan profil bisnis dari
sementara (localStorage) ke database. Ditambah **upload gambar dasar** ke database
gambar (dengan deskripsi & kategori) supaya terlihat datanya benar-benar tersimpan.

---

## Catatan Auth (penting)

Untuk sekarang **belum pakai login/auth beneran** (mode trial, satu workspace dev).
TAPI struktur tabel harus sudah menyertakan kolom pemilik (mis. `business_id`)
dengan satu nilai dev tetap, supaya nanti login + keamanan RLS bisa dipasang tanpa
merombak struktur. **Auth beneran + RLS = irisan terpisah (perlu review ekstra
ketat) — jangan dikerjakan di sini.**

---

## Struktur Tabel (Claude Code yang buat via migration/SQL)

1. **business_profile** — semua data onboarding:
   - identitas: nama bisnis, jenis usaha, lama berjalan, lokasi
   - produk/pelanggan: produk utama, produk unggulan, kisaran harga, target, masalah
     yang dipecahkan
   - pesan: USP/pembeda, tujuan konten, nada brand, CTA, **hal yang dihindari**
   - deskripsi diri / cerita usaha (teks bebas)
   - sosial media: daftar platform + handle, dan 3 yang dipilih untuk ditampilkan
   - referensi logo (path di Storage)
   - kolom `business_id` (nilai dev tetap untuk sekarang), `created_at`, `updated_at`

2. **images** — database gambar:
   - `id`, `business_id`
   - `storage_path` (lokasi file di Supabase Storage)
   - `description` (teks — dipakai AI nanti untuk mencocokkan dengan konten)
   - `category` (mis. Logo, Produk, Wajah/Orang, Suasana/Fasilitas, Lain-lain — buat mudah diperluas)
   - `type` (logo / produk / wajah / suasana / lain)
   - `usage` — **perlakuan gambar**: `apa_adanya` (foto asli dipakai langsung, mis.
     ruangan RS / interior toko / foto fasilitas) ATAU `olah_ai` (bahan yang boleh
     ditransform/diberi latar oleh AI nanti, mis. produk polos). Default `apa_adanya`.
     (Kolom ini disiapkan sekarang; logika perlakuannya baru dipakai di slice generate
     gambar nanti — di spec ini cukup menyimpan pilihannya.)
   - `created_at`

3. **categories** (opsional, boleh sekadar daftar tetap di kode dulu) — untuk
   mengelompokkan gambar. Kalau lebih mudah, cukup kolom `category` bertipe teks di
   tabel images dengan daftar pilihan tetap.

(Tabel riwayat konten & alur arc menyusul di irisan lain — jangan dibuat sekarang.)

---

## Storage
- Buat bucket Supabase Storage untuk file gambar (mis. `user-images`).
- Upload menyimpan file ke bucket, dan barisnya ke tabel `images` (path + deskripsi
  + kategori).

---

## Yang Dikerjakan
1. Pastikan client Supabase membaca env dengan benar (health check env boleh dipakai).
2. Buat migration/SQL untuk tabel di atas + bucket Storage.
3. **Pindahkan profil bisnis dari localStorage ke database**: saat onboarding
   selesai (atau saat disimpan), tulis ke `business_profile`; halaman lain membaca
   dari DB. (Jembatan localStorage lama boleh dihapus.)
4. **Upload gambar dasar** di dashboard: pilih file → isi **deskripsi** + pilih
   **kategori** + pilih **perlakuan** (`apa_adanya` / `olah_ai`; default `apa_adanya`)
   → simpan ke Storage + tabel `images`. Tampilkan daftar gambar yang sudah diunggah,
   dikelompokkan per kategori.

## Yang TIDAK dikerjakan di sini (irisan berikutnya)
- Login/auth beneran + RLS (spec khusus, review ketat).
- Hapus latar logo otomatis + dashboard edit profil lengkap (spec-09).
- AI memilih gambar berdasarkan deskripsi saat generate (spec-10).
- AI mengubah/membuat ulang gambar (mahal — jauh nanti).
- Riwayat konten & alur arc.

---

## Kriteria Terima (Acceptance)
- App tersambung ke Supabase (tanpa error saat env terisi).
- Tabel `business_profile` & `images` + bucket Storage terbuat.
- Menyelesaikan onboarding menyimpan profil ke database; muat ulang halaman →
  data masih ada (bukti persist, tidak hilang seperti localStorage).
- Bisa upload 1 gambar + deskripsi + kategori → file masuk Storage, baris masuk
  tabel `images`, dan tampil di daftar per kategori.
- Rahasia tidak disentuh; struktur menyertakan `business_id` untuk auth nanti.

---

## Test yang Harus Ada
- **Unit:** fungsi menyimpan/membaca profil memetakan field dengan benar (boleh
  mock client Supabase — jangan hit DB produksi dalam test).
- **Unit:** fungsi membuat baris image menyusun objek (path+deskripsi+kategori) benar.
- Penanganan error koneksi/env → pesan ramah, bukan crash.
- Assertion bermakna. Test lama tetap hijau.

---

## Deliverable (perkiraan)
```
supabase/migrations/...            # SQL tabel + bucket
lib/supabase/...                   # fungsi baca/tulis profil & images
app/onboarding/...                 # simpan profil ke DB
app/dashboard/...                  # upload gambar + daftar per kategori
__tests__/...
```

## Smoke Test Manual (untuk pemilik)
1. Isi `.env.local` (URL + publishable key), `npm run dev`.
2. Selesaikan onboarding → muat ulang halaman → pastikan data profil masih ada.
3. Di dashboard, upload 1 gambar, beri deskripsi + kategori → cek muncul di daftar.
4. Cek di dashboard Supabase (Table editor & Storage) bahwa datanya benar-benar
   tersimpan.

## Catatan
Ini fondasi. Setelah data benar-benar tersimpan, spec-09 menambah hapus-latar logo
+ dashboard edit lengkap, lalu spec-10 membuat AI memilih gambar dari deskripsinya.
