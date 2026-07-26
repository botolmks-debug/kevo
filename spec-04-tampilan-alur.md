# Spec Irisan 04 — Tampilan & Alur Website (UI Shell Premium)

Serahkan ke Claude Code. Patuhi `CLAUDE.md`.
**Saran urutan:** kerjakan spec-04 ini SEBELUM spec-03 (10 template), karena
spec-04 menetapkan gaya desain yang akan dipakai semua halaman — termasuk form
generate. (Nomor spec hanya label, bukan urutan wajib.)

---

## PERAN

Untuk tugas ini kamu berperan sebagai **desainer produk / UI designer senior**.
Kamu tidak bisa melihat hasilnya, jadi patuhi panduan gaya di bawah dengan ketat
supaya tampilan konsisten dan terasa premium — bukan default polos.

---

## Tujuan

Bangun **kerangka semua halaman utama** (UI shell / prototype) yang **tampil
bagus dan bisa diklik berpindah**, supaya pemilik bisa merasakan **alur website**
dari awal sampai akhir. Fungsi asli (auth beneran, simpan ke database) **belum**
dibuat di sini — tombol boleh sekadar berpindah halaman (stub). Yang penting:
tampilan premium + navigasi antar halaman jalan.

**Satu pengecualian penting:** halaman generate yang **sudah berfungsi** (dari
spec-02) JANGAN dirusak — pindahkan/rapikan ke dalam gaya baru dan pastikan tetap
bisa render PNG seperti sebelumnya.

---

## Panduan Gaya (Design System) — buat SEKALI, pakai di SEMUA halaman

Terapkan sebagai token (mis. di konfigurasi Tailwind + CSS variables) lalu pakai
ulang di semua halaman. Jangan hardcode warna berbeda-beda per halaman.

**Kesan:** modern & berani — warna tegas, kontras kuat, percaya diri, bersih.

**Warna:**
- Primary (biru berani): `#2563EB` (dan variasi lebih gelap `#1D4ED8` untuk hover).
- Dark/navy (untuk teks utama & bagian dramatis): `#0F172A`.
- Latar terang: putih `#FFFFFF` dan abu sangat muda `#F8FAFC`.
- Aksen kontras untuk CTA penting: boleh kuning/amber cerah `#FACC15` atau cyan
  cerah `#06B6D4` — pilih satu, pakai hemat untuk penekanan.
- Teks di atas biru/navy: putih.

**Tipografi:** Inter (sudah ada di project). Heading tebal & besar dengan skala
jelas (mis. hero besar, judul section sedang, body nyaman dibaca). Berani pada
heading, tenang pada body.

**Bentuk & kedalaman:**
- Sudut membulat konsisten (mis. radius ~12–16px) untuk kartu, input, tombol.
- Bayangan halus (soft shadow) pada kartu untuk kesan premium & berlapis.
- Ruang kosong lega; jangan sesak.

**Tombol:**
- Primary: isi biru penuh, teks putih, tebal, membulat, hover menggelap.
- Secondary: garis tepi (outline) biru, latar transparan.
- CTA penting boleh pakai warna aksen.

**Layout:**
- Konten dibatasi lebar maksimum & di-tengah, padding lega.
- Halaman setelah login pakai **header/nav konsisten** (logo kiri + menu).

---

## Halaman yang Dibuat (semua sekaligus)

### 1. Login / Daftar / Lupa Password  (`/login`)
- Satu halaman dengan tiga keadaan: **Masuk**, **Daftar**, **Lupa password**
  (pakai tab atau tautan berganti).
- Field bergaya premium (email, password). Tombol primary besar.
- Untuk sekarang: tombol "Masuk"/"Daftar" cukup **berpindah ke `/onboarding`**
  (stub, belum auth beneran). "Lupa password" tampilkan pesan konfirmasi palsu.
- Sisi kiri/atas boleh panel biran/navy dramatis dengan tagline produk (kesan
  premium).

### 2. Onboarding Bisnis  (`/onboarding`)
- Form bertahap/berurutan: **nama bisnis**, beberapa **pertanyaan terpandu**
  tentang bisnis, **unggah beberapa gambar** (cukup UI + preview, belum disimpan
  ke server), dan **tautan sosial media**.
- Tombol "Lanjut" → **berpindah ke `/dashboard`** (stub).
- Tampilkan progress (mis. langkah 1/3) supaya terasa berurutan.

### 3. Dashboard  (`/dashboard`)
- Ini "rumah" aplikasi: header/nav konsisten + area utama.
- Tampilkan **fitur generate** (dari spec-02) di dalam gaya baru — boleh sebagai
  bagian dashboard atau halaman `/dashboard/generate` yang tertaut dari dashboard.
  **Fungsi render harus tetap jalan** seperti sebelumnya.
- Sediakan tempat (placeholder) untuk fitur yang akan datang: database gambar,
  daftar konten, editor — cukup kartu/menu kosong bertuliskan "segera hadir",
  supaya alurnya terasa lengkap.

### Navigasi
- Root `/` mengarahkan ke `/login`.
- Alur bisa diklik penuh: `/login` → `/onboarding` → `/dashboard` → generate.
- Header dashboard punya tautan yang berfungsi antar bagian.

---

## Yang TIDAK dikerjakan di sini (irisan berikutnya)
- Auth beneran (verifikasi email/password) — nanti dengan Supabase.
- Menyimpan data onboarding & gambar ke database.
- 10 template (spec-03), caption AI, editor, sistem token.
Semua tombol yang belum berfungsi cukup jadi stub/navigasi, JANGAN dipaksakan.

---

## Kriteria Terima (Acceptance)
- Bisa `npm run dev` lalu **mengeklik alur penuh**: buka `/` → login → onboarding
  → dashboard → generate, semua berpindah dengan benar.
- Semua halaman memakai **satu gaya konsisten** (biru berani, kartu membulat,
  tipografi berjenjang) — terasa premium, bukan default.
- Halaman `/generate` yang lama **tetap bisa render PNG** (tidak rusak).
- Responsif wajar (tidak berantakan di layar lebih kecil).
- Dinilai enak dilihat lewat **smoke test manual pemilik**.

---

## Test yang Harus Ada
- **Unit/render:** tiap halaman (`/login`, `/onboarding`, `/dashboard`) ter-render
  tanpa error dan memuat elemen kunci (mis. judul, tombol utama).
- **Unit:** tautan navigasi utama mengarah ke rute yang benar.
- Test generate lama tetap hijau (tidak ada regresi).
- Assertion bermakna, bukan test kosong.

---

## Deliverable (perkiraan)
```
app/login/page.tsx
app/onboarding/page.tsx
app/dashboard/page.tsx        (+ generate di dalam gaya baru)
app/page.tsx                  (redirect ke /login)
app/globals.css / tailwind    (token warna, radius, dsb — dipakai semua halaman)
components/ui/...             (tombol, input, kartu, header — dipakai ulang)
__tests__/...
```

## Smoke Test Manual (untuk pemilik)
1. `npm run dev`, buka `http://localhost:3000`.
2. Klik alur: login → onboarding → dashboard → generate.
3. Nilai dengan mata: konsisten? berani & premium? enak dilihat?
4. Pastikan generate PNG masih jalan.
5. Catat halaman/bagian mana yang perlu dipoles.

## Catatan Jujur
Ini kerangka premium untuk merasakan alur — titik awal yang kuat, bukan versi
final. Setelah jadi, pemilik menilai & minta perbaikan bagian yang perlu.
