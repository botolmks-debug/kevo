# Spec Irisan 06 — Generate Caption AI (Gemini) + Pengaman Biaya

Serahkan ke Claude Code. Patuhi `CLAUDE.md`. Membangun di atas spec-02
(halaman `/generate`) & spec-05 (profil bisnis dari onboarding). Ini **integrasi
AI pertama** — dibuat kecil, aman, dan hemat biaya.

---

## PRASYARAT (tugas pemilik, BUKAN agen)

Sebelum spec ini jalan, pemilik menyiapkan **API key Gemini**:
1. Ambil dari Google AI Studio (`aistudio.google.com` → "Get API key").
2. Tempel ke `.env.local` sebagai:  `GEMINI_API_KEY=...`  (server-side; **tanpa**
   `NEXT_PUBLIC_`).

**Agen:** JANGAN menyentuh/membaca `.env.local`. Cukup pakai `process.env.GEMINI_API_KEY`
di sisi server. Kalau key belum ada, tampilkan pesan ramah, jangan crash.

---

## PERAN
Untuk kualitas caption, kamu berperan sebagai **ahli komunikasi marketing**.

---

## Tujuan

Tambahkan tombol **"Generate Caption (AI)"** di halaman `/generate`. Saat ditekan,
sistem memakai **Gemini** untuk menulis **caption** yang sesuai bisnis — berdasarkan
**profil bisnis** (dari onboarding) + konten yang sedang dibuat (template, headline,
isi). Hasilnya tampil sebagai **teks yang bisa diedit** (draft), bukan final.

Ini generate **teks** saja. Generate gambar AI TIDAK dikerjakan di sini (lebih mahal
& berisiko — irisan terpisah nanti).

---

## PENGAMAN BIAYA (WAJIB — ini bagian terpenting)

Pemilik pernah mengalami saldo Gemini terkuras dan model image sering balas 503.
Pasang pengaman ini dari awal:

1. **Panggil Gemini hanya dari server** (route API), tidak dari browser. Key tidak
   pernah sampai ke klien.
2. **Model teks yang murah & ringan.** Pakai model dari keluarga *flash-lite*
   (paling hemat). Simpan nama model di **satu konstanta/env** (`GEMINI_TEXT_MODEL`)
   supaya mudah diganti — nama model Gemini sering berubah/di-deprecate, jadi tangani
   error "model not found" dengan pesan jelas.
3. **Batasi panjang output** (mis. `maxOutputTokens` secukupnya untuk 1 caption) —
   ini pembatas biaya per panggilan yang paling langsung.
4. **Cegah panggilan beruntun:** tombol dinonaktifkan selama proses berjalan
   ("sedang membuat…"), dan beri jeda (cooldown) singkat antar panggilan. Tidak boleh
   ada spam klik → banyak panggilan.
5. **Retry berjeda untuk 503 "high demand":** coba ulang paling banyak 3x dengan jeda
   3 / 6 / 10 detik, lalu berhenti dengan pesan ramah (jangan loop tak terbatas).
6. **Timeout** panggilan (mis. hentikan kalau > ~20 detik).
7. Karena mode **trial free**, TIDAK ada kuota per user — tapi pengaman teknis di atas
   tetap wajib supaya biaya tidak lepas kendali.

---

## Kualitas Caption (arahan marketing)

Prompt ke Gemini harus menyuntikkan **guideline bisnis dari profil**:
- Nada/gaya brand (santai/profesional/dll), tujuan konten, USP/pembeda.
- **Patuhi "hal yang harus dihindari"** dari profil (kata/klaim/topik pantangan).
- Gaya soft-selling; sertakan CTA yang sesuai bila relevan.
- **Hindari pembuka klise** (mis. jangan selalu "Pernah nggak sih…"); variasikan gaya
  pembuka tiap generate.
- Ringkas, satu ide utama; boleh sertakan beberapa hashtag relevan.
- Output dalam Bahasa Indonesia (kecuali profil menyiratkan lain).

Caption keluar sebagai **draft yang bisa diedit** user sebelum dipakai.

---

## Yang TIDAK dikerjakan di sini (irisan berikutnya)
- Generate **gambar** AI (mahal/berisiko) — spec terpisah nanti.
- Alur arc (hook→build-up→closing), carousel, tipe interaksi/kuis — irisan besar sendiri.
- Menyimpan caption ke database — belum ada DB.
- Sistem kuota/token — dilewati (trial free).

---

## Kriteria Terima (Acceptance)
- Di `/generate`, tombol "Generate Caption (AI)" menghasilkan caption yang relevan
  dengan profil bisnis & konten, tampil sebagai teks yang bisa diedit.
- Caption mengikuti nada brand & menghindari "hal yang dihindari" dari profil.
- Tombol nonaktif selama proses; ada indikator "sedang membuat…".
- Kalau Gemini gagal/503/tanpa key → pesan ramah, tidak crash, tidak loop.
- Key hanya di server; tidak ada key bocor ke sisi klien.

---

## Test yang Harus Ada (JANGAN memanggil Gemini asli saat test)
- **Unit:** pembentukan prompt dari (profil bisnis + konten) menghasilkan teks yang
  memuat guideline kunci (nada, hal yang dihindari).
- **Unit:** logika retry/backoff (mock 503 → mencoba ulang sesuai jeda, lalu menyerah).
- **Unit:** penanganan "key tidak ada" & error → pesan ramah, bukan crash.
- **Unit/UI:** tombol dinonaktifkan selama proses.
- Panggilan Gemini di test harus **di-mock**, bukan hit API sungguhan (supaya test
  gratis & cepat). Assertion bermakna.

---

## Deliverable (perkiraan)
```
app/api/generate-caption/route.ts   # panggil Gemini (server), pengaman biaya
lib/ai/gemini.ts                     # klien Gemini + retry/backoff + timeout + model config
lib/ai/captionPrompt.ts              # bangun prompt dari profil + konten
app/generate/page.tsx                # tombol + tampilan caption editable + status
__tests__/...
```

## Smoke Test Manual (untuk pemilik)
1. Pastikan `GEMINI_API_KEY` sudah di `.env.local`, lalu `npm run dev`.
2. (Isi onboarding dulu supaya ada profil bisnis, atau pakai profil demo.)
3. Buka `/generate`, isi konten, klik **Generate Caption (AI)**.
4. Cek: caption keluar, nyambung dengan bisnis, bisa diedit. Klik lagi → gaya
   pembuka berbeda.
5. Uji tanpa key / matikan internet → pastikan keluar pesan ramah, bukan crash.
6. Perhatikan tidak ada panggilan beruntun saat tombol diklik cepat berkali-kali.

## Catatan
Ini generate caption pertama — sengaja hemat & aman. Generate gambar AI dan
alur konten lanjutan (arc, carousel, interaksi) menyusul sebagai irisan terpisah,
masing-masing dengan pengaman biayanya sendiri.
