# Spec Irisan 02 — Halaman Generate (Dashboard Inti)

Kerjakan setelah spec-01 selesai. Serahkan ke Claude Code. Patuhi `CLAUDE.md`.

---

## Tujuan

Buat **satu halaman** tempat user mengetik teks, memilih template contoh, dan
menekan tombol → **melihat gambar konten (PNG) hasil render langsung di halaman**,
plus tombol download. Ini menghidupkan bagian inti "Dashboard" (Kotak 3) dengan
memakai **mesin render dari spec-01** — belum ada login, database, atau token.

---

## Scope

**Termasuk:**
- Satu halaman, mis. `/generate`, dengan form sederhana (pakai Tailwind).
- Field form:
  - Pilih template (untuk sekarang hanya `example-pengumuman` — cukup satu opsi).
  - Teks **headline**.
  - Teks **isi**.
  - **URL gambar** (input teks — user tempel URL gambar).
- Tombol **Generate** → memanggil route `/api/render` (yang sudah ada) dengan
  nilai form → menampilkan **PNG hasilnya** di halaman.
- Tombol **Download PNG**.
- Penanganan sederhana: field kosong / URL gambar rusak → tampilkan pesan ramah,
  bukan crash (mesin render sudah punya fallback placeholder, manfaatkan itu).
- Indikator "sedang membuat…" saat menunggu render.

**TIDAK termasuk (irisan berikutnya, jangan dikerjakan sekarang):**
- Login / auth (spec-03)
- Onboarding & profil bisnis (spec-04)
- Caption via AI / LLM (irisan berikutnya)
- Upload file gambar + database gambar (untuk sekarang cukup URL gambar)
- Editor tata letak / geser layer / atur font-ukuran (spec-06)
- **Sistem token / kuota — DILEWATI. Generate bebas tanpa batas (mode trial free).**
  Jangan tambahkan pengecekan kuota apa pun.

---

## Alur Halaman

1. User buka `/generate`.
2. Isi headline, isi, dan URL gambar.
3. Klik **Generate**.
4. Halaman kirim nilai form ke `/api/render` (memakai template `example-pengumuman`).
5. PNG yang kembali ditampilkan di halaman.
6. User bisa klik **Download PNG**.

---

## Catatan Teknis

- Pakai ulang route `/api/render` dan template contoh dari spec-01 — jangan bikin
  mesin render baru.
- Bentuk request harus sesuai `RenderInput` yang sudah didefinisikan di spec-01
  (templateId/template + values per slot). Petakan field form ke slot yang benar
  (headline → slot headline, isi → slot teks isi, URL gambar → slot gambar).
- Tampilkan hasil sebagai `<img>` dari PNG yang dikembalikan (mis. object URL atau
  data URI di sisi browser). Jangan simpan ke server — cukup tampil & bisa diunduh.
- Ikuti aturan React di lingkungan ini (lihat `CLAUDE.md` / frontend-design bila ada):
  jangan pakai `<form>` submit klasik yang me-reload; pakai handler tombol.

---

## Kriteria Terima (Acceptance)

- Buka `/generate` → form tampil rapi.
- Isi headline + isi + URL gambar valid → klik Generate → **PNG muncul di halaman**,
  ukuran benar (1080×1350), frame brand (logo/badge/footer) pada posisi tetap.
- Tombol Download menghasilkan file PNG yang bisa dibuka.
- URL gambar rusak/kosong → tetap keluar gambar dengan placeholder, tidak crash,
  tidak ada error 500.
- Tidak ada error di console pada alur normal.

---

## Test yang Harus Ada

- **Unit:** fungsi yang membangun payload `RenderInput` dari state form
  menghasilkan bentuk yang benar (field terpetakan ke slot yang tepat).
- **Unit:** validasi form sederhana (mis. tombol Generate menangani field kosong
  dengan benar).
- Assertion harus bermakna — bukan test kosong.
- Bagian visual (rapi/enak dilihat) diperiksa lewat **smoke test manual** oleh
  pemilik, bukan oleh test otomatis.

---

## Deliverable (perkiraan)

```
app/generate/page.tsx        # halaman form + preview + download
app/generate/...             # helper kecil bila perlu (mapping form → RenderInput)
__tests__/...                # test di atas
```

## Smoke Test Manual (untuk pemilik)

1. `npm run dev`
2. Buka `http://localhost:3000/generate`
3. Isi headline + isi + satu URL gambar (mis. gambar apa saja dari internet).
4. Klik **Generate** → pastikan PNG muncul, frame brand rapi, teks masuk kotak.
5. Klik **Download** → buka file PNG-nya.

Kalau gambar keluar dan enak dilihat → spec-02 beres. Lalu berhenti untuk review;
jangan lanjut ke spec berikutnya.
