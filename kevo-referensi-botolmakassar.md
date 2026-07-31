# Referensi Botol Makassar → Kevo (handoff untuk Claude Code)

## Pendekatan: TAB "OTOMATIS" TERPISAH
Alur otomatis dibangun sebagai **tab/menu baru "Otomatis"** di Kevo, **terpisah**
dari tab manual (`/generate`) yang sudah ada. Tab manual **dibiarkan apa adanya —
jangan diubah, jangan dirombak, jangan dihapus.** Keduanya hidup berdampingan.
Ini menghindari rework dan risiko merusak yang sudah jalan.

---

## A. File yang perlu kamu salin dari repo Botol Makassar
Salin ke folder baru `reference/botolmakassar/` di repo Kevo. Ini **read-only,
cuma untuk dipelajari** — bukan untuk di-import langsung (arsitektur Kevo beda:
multi-tenant + TypeScript).

**JANGAN bawa `.env`, kunci API, atau file berisi secret apa pun.** Cukup kode
logikanya.

Wajib (inti mesin otomatis):
- `app/api/konten-harian/route.js` — otak sistem: memilih materi otomatis,
  generate gambar + caption, mengelola arc, menyimpan ke DB + Storage.
- Semua **lib/helper yang di-import** oleh route itu: pemanggil Gemini (teks &
  image), builder prompt, daftar `GAYA_BUKA` (anti-klise), daftar momen kalender.
  Bawa semua yang jadi dependensinya.
- **Skema/migration** tabel `konten_harian`, `konten_arc`, `artikel` (atau yang
  setara) — supaya struktur data arc & draft kelihatan.

Opsional (untuk referensi fitur lanjutan, bukan prioritas sekarang):
- `vercel.json` (contoh konfigurasi cron).
- Route `reminder-konten`, `konten-carousel`, `konten-hapus`, dan tipe konten
  "interaksi".

Catatan: nama file/path di atas dari ingatan sistem yang kita bangun — kalau di
repo aslinya sedikit beda, bawa file yang **perannya sama**.

---

## B. Perintah ke Claude Code (setelah file di atas ada di `reference/botolmakassar/`)

Salin-tempel ini ke Claude Code:

---
Di `reference/botolmakassar/` ada kode mesin konten otomatis dari proyek Botol
Makassar (single-tenant, JavaScript). Itu **referensi read-only** — jangan
di-import atau di-copy mentah ke Kevo. Kevo beda: multi-tenant, TypeScript, dan
tiap data (profil bisnis, target market, database gambar) milik **per-klien**.

**Ruang lingkup — penting:** alur otomatis ini dibangun sebagai **tab/menu baru
"Otomatis"** yang terpisah. **Tab manual `/generate` yang sudah ada JANGAN
disentuh** — biarkan berfungsi apa adanya. Keduanya berdampingan.

Tugasmu sekarang **hanya menyusun rencana, belum ngoding:**

1. Pelajari `reference/botolmakassar/`, terutama `konten-harian/route.js` dan
   helper yang dipakainya. Pahami polanya: bagaimana materi/angle dipilih
   otomatis, bagaimana gambar dipilih, bagaimana caption dibuat, bagaimana arc
   (hook → build-up → closing) disimpan, dan bagaimana Gemini dipanggil berikut
   pengaman biaya + retry 503.

2. Susun **rencana adaptasi** pola itu ke Kevo multi-tenant sebagai **tab
   "Otomatis" baru** (sesuai `spec-arah-otomatis-kevo.md` Langkah 1): route/
   halaman baru untuk tab Otomatis; struktur tabel antrean konten per klien
   (draft → review → posted); cara sistem memilih materi + gambar (dari database
   gambar klien lewat deskripsi) + membuat caption untuk tiap klien; dan bagian
   mana dari Botol Makassar yang bisa dipakai ulang vs yang harus diubah karena
   multi-tenant. **Pastikan rencana ini tidak mengubah file tab manual.**

3. Tandai perbedaan penting (single → multi tenant, JS → TS, data per-klien) dan
   risiko/biayanya.

Keluarkan sebagai **dokumen rencana**. Jangan sentuh kode dulu, jangan sentuh
`.env`, jangan ubah tab manual. Aku review dulu sebelum kamu mulai membangun.
---
