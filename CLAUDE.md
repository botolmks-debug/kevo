# CLAUDE.md — Aturan Main Agen

File ini adalah panduan kerja untuk Claude Code di project ini.
Baca dan patuhi setiap sesi.

---

## Konteks Project

Aplikasi jasa/produk **generate konten sosial media** untuk bisnis & instansi
(RS, klinik, sekolah, UMKM). Model utama: **template brand tetap + teks + gambar
→ konten jadi + caption otomatis**.

**Stack:**
- Next.js (App Router), deploy di Vercel
- Supabase (Postgres + Auth + Storage)
- Satori / `@vercel/og` untuk render gambar template (deterministik, bukan AI image)
- LLM (Gemini) untuk generate caption
- Dikerjakan solo oleh 1 developer (pemilik repo)

**Cara kerja:** dibangun per **irisan vertikal** — satu fitur utuh dari
input → proses → output, bukan seluruh app sekaligus. Kerjakan 1 irisan,
berhenti, tunggu review pemilik, baru lanjut.

---

## Aturan Wajib (jangan dilanggar)

1. **Selalu di branch, jangan pernah commit ke `main`.**
   Buat branch baru per task (mis. `feat/template-render`). Kalau ragu branch
   apa, tanya.

2. **Selalu tulis test bareng kode.** Task belum selesai kalau testnya belum
   ada dan belum lulus. Test harus punya assertion bermakna — dilarang bikin
   test kosong yang "lulus" tapi tidak menguji apa pun.

3. **Jangan pernah menyentuh atau commit rahasia.** File `.env*` off-limits:
   jangan dibaca isinya untuk ditampilkan, jangan di-commit, jangan cetak nilai
   key/secret ke log atau output. Pastikan `.env*` ada di `.gitignore`.

4. **Jangan jalankan command destruktif tanpa izin.** Termasuk: `rm -rf`,
   drop/truncate tabel, `supabase db reset`, migrasi yang menghapus data,
   dan **deploy ke produksi**. Usulkan dulu, tunggu konfirmasi.

5. **Jangan sambung ke database produksi.** Hanya pakai Supabase lokal/dev
   dengan data dummy. Kalau butuh DB dan belum ada yang dev, tanya.

6. **Perubahan minimal & fokus.** Kerjakan hanya yang diminta di task. Jangan
   refactor kode lain yang tidak berkaitan tanpa diminta.

7. **Tunjukkan rencana sebelum perubahan besar.** Untuk perubahan >1-2 file
   atau yang mengubah struktur, jelaskan rencananya dulu sebelum mengeksekusi.

8. **Area berisiko tinggi = review ekstra.** Untuk **auth, pembayaran, dan Row
   Level Security multi-tenant**: usulkan kode + jelaskan tiap keputusan, dan
   tulis test khusus untuk **isolasi antar tenant** (satu tenant tidak boleh
   bisa membaca data tenant lain). Jangan anggap ini beres tanpa test isolasi.

9. **Bertanya kalau tidak yakin.** Lebih baik tanya daripada menebak asumsi
   yang salah (mis. nama kolom, bentuk data, tujuan fitur).

10. **Laporkan jujur.** Setelah selesai: jalankan lint + test, dan laporkan
    hasil apa adanya. Jangan bilang "hijau/lulus" kalau belum benar-benar
    dijalankan.

---

## Definition of Done (tiap task)

- [ ] Kode + test ditulis
- [ ] `npm test` lulus (assertion bermakna)
- [ ] `npm run lint` bersih
- [ ] Diff kecil & mudah di-review
- [ ] Ada cara pemilik menjalankan & melihat hasilnya secara manual (smoke test)
- [ ] Rahasia tidak tersentuh, tidak ada perubahan di luar scope task

---

## Perintah Project

> Isi/sesuaikan dengan yang sebenarnya di repo ini.

```bash
npm install          # install dependency
npm run dev          # jalankan lokal
npm test             # jalankan test
npm run lint         # cek lint
```

---

## Catatan Gaya Kerja Pemilik

- Kalau memberi instruksi perubahan file, sebutkan **nomor baris** atau berikan
  **isi file utuh**, bukan potongan diff samar.
- Selesai satu irisan → berhenti dan minta review, jangan lanjut sendiri ke
  irisan berikutnya.
