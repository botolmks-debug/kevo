# Spec — Arah Otomatis Kevo (North Star) + Rencana Kerja

Baca `CLAUDE.md` dulu untuk konteks produk. Dokumen ini meluruskan Kevo kembali
ke visi **otomatis-dulu** dan menetapkan urutan kerja.

---

## 1. Kenapa dokumen ini ada
Build sejauh ini menumpuk fitur **manual** (`/generate` form, ukuran, AI-compose,
editor) di atas fondasi manual (spec-02). Itu membuat Kevo makin susah dipakai —
kebalikan dari Botol Makassar yang enak justru karena **otomatis**. Dokumen ini
menetapkan alur otomatis sebagai inti dan mendemosikan yang manual.

## 2. Alur utama yang harus dibangun
1. Klien onboarding sekali: profil bisnis, **target market**, sosmed (pilih 3
   untuk footer), unggah database gambar + deskripsi tiap gambar.
2. Sistem **auto-generate** konten untuk klien itu: pilih materi/angle → pilih
   gambar dari database klien (dicocokkan lewat deskripsi) → buat caption →
   render (Satori) → simpan sebagai **draft** di **antrean review** klien.
3. Klien buka antrean: lihat draft, edit teks seperlunya, tandai **posted**
   (posting manual ke IG dulu; auto-post menyusul).

## 3. Pola auto-generate (adaptasi dari Botol Makassar yang sudah terbukti)
- Konten idealnya **beralur**: hook → build-up → closing (bukan konten lepas
  tiap hari) — ini USP "AI sebagai ahli marketing".
- Selipkan tipe konten variatif: produk, edukasi/topik, interaksi (kuis/quote/
  tips).
- Base gambar = **foto asli dari database gambar klien**, dicocokkan via
  deskripsi; bukan generate dari nol. (AI-compose = fitur terpisah & ditunda.)
- Caption anti-klise: acak gaya pembuka, larang frasa klise & meniru pembuka
  beberapa caption terakhir.
- Boleh menyesuaikan momen kalender **positif** (hindari topik duka/politik).
- Pengaman biaya Gemini dari awal; retry berjeda untuk 503.

## 4. Yang DIPAKAI ULANG dari build sekarang (tidak ada yang terbuang)
Onboarding, database gambar + deskripsi, matching by description, render Satori,
caption Gemini, pengaman biaya. Semua jadi bahan baku alur otomatis.

## 5. Yang DIDEMOSIKAN / DITUNDA
- `/generate` manual → jalur sekunder (boleh tetap ada, bukan pusat).
- AI-compose gambar (Bagian B di `spec-perbaikan-render-generate`) → **ditunda**.
- Editor layer geser-geser (`spec-editor-kanvas-kevo`) → **ditunda**.

## 6. Yang tetap perlu dibetulkan dari sesi kemarin
Karena konten **otomatis pun tetap dirender**, ambil yang relevan dari
`spec-perbaikan-render-generate` **Bagian A saja**:
- Fit gambar (contain + blur / full-bleed) — supaya tidak kepotong.
- Logo selalu overlay di tiap konten.
- **Auto-match gambar dari deskripsi** — ini JUSTRU inti alur otomatis (sistem
  pilih gambar sendiri), bukan sekadar fitur manual.
- Hapus gambar di dashboard (housekeeping, prioritas rendah).
Yang murni manual (dropdown pilih gambar di form, dsb) tidak perlu diprioritaskan.

---

## 7. RENCANA KERJA BESOK (urutan — serahkan satu per satu ke Claude Code)

**Langkah 0 — Pasang jangkar.**
Commit `CLAUDE.md` (visi) dan dokumen ini ke repo sebelum mulai. Ini yang mencegah
drift balik ke manual.

**Langkah 1 — MINTA RENCANA DULU (bukan koding).**
Suruh Claude Code menyusun **rencana arsitektur** pipeline auto-generate
multi-tenant, belum ngoding: struktur tabel antrean konten per klien (status
draft → review → posted), cara sistem memilih materi/angle, cara memanggil gambar
dari database klien lewat deskripsi, cara membuat caption. Review rencananya dulu
sebelum acc.

**Langkah 2 — Render essentials untuk konten auto.**
Kerjakan dari `spec-perbaikan-render-generate` Bagian A: perbaiki fit gambar
(contain+blur / full-bleed, tanpa AI) dan logo selalu overlay. (Bagian B / AI
diabaikan dulu.)

**Langkah 3 — Auto-match gambar dari deskripsi.**
Implement pemilihan gambar otomatis (algoritma matching per kata utuh, skor
tertinggi) dari database klien. Ini dipakai pipeline otomatis untuk memilih foto.

**Langkah 4 — Pipeline auto-generate v1.**
Satu aksi "Generate konten" per klien → sistem pilih materi + gambar + buat
caption + render → simpan sebagai **draft** di antrean. Belum cron, belum arc —
**satu konten dulu** end-to-end. Pengaman biaya terpasang.

**Langkah 5 — Antrean review klien.**
Halaman daftar draft: klien lihat konten, edit teks, tandai **posted**.

**Langkah 6+ (nanti, jangan sekarang).**
Arc hook → build-up → closing, penjadwalan otomatis (cron), lalu baru
pertimbangkan AI-compose & editor layer bila memang dibutuhkan.

---

Aturan tiap langkah: tunjukkan rencana file yang disentuh dulu, jangan apply
sampai di-acc, jaga test/lint/typecheck hijau.
