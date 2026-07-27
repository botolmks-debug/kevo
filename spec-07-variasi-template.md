# Spec Irisan 07 — Perbaikan 10 Template: Variasi Desain NYATA

Serahkan ke Claude Code. Patuhi `CLAUDE.md`. Ini **mendesain ulang** 10 template
dari spec-03 supaya benar-benar berbeda satu sama lain.

---

## Masalah yang diperbaiki

10 template sekarang sebenarnya **satu desain yang sama, isinya digeser-geser** —
posisi logo sama, tata letak sosial media sama, pola visual sama. Ini BUKAN yang
diinginkan.

**Yang diinginkan: tiap template adalah desain yang benar-benar berbeda**, bukan
sekadar konten dipindah. Yang HARUS bervariasi antar template:
- **Tata letak logo** berbeda (kiri atas / tengah atas / bawah / menyatu di sudut, dst).
- **Tata letak sosial media** berbeda, dan **pakai IKON/logo platform** (Instagram,
  WhatsApp, TikTok, dll) — **bukan teks handle saja**.
- **Pola/motif desain** berbeda (ada yang pakai pattern/bentuk dekoratif, warna
  blok, gradient, dsb).
- **Beberapa template dibuat polos/minimalis** — hanya gambar + tata letak sosial
  media, **tanpa pattern**.

Tetap patuhi peran & prinsip desain dari spec-03 (hierarki, kontras, ruang kosong,
konsistensi warna brand spec-04). Kanvas tetap 1080×1350. Tetap pakai mesin render
spec-01 (bentuk data Template + Slot) — jangan bikin mesin baru.

---

## Ikon Sosial Media

- Footer/sosial media menampilkan **maksimal 3 platform terpilih** (dari onboarding
  spec-05), masing-masing dengan **ikon platform-nya** + handle.
- Render ikon sebagai **inline SVG** (supaya terbaca oleh Satori). Sediakan set ikon
  SVG untuk platform utama: Instagram, WhatsApp, Facebook, TikTok, YouTube, X,
  LINE, Telegram, LinkedIn, Website (dan lainnya dari daftar spec-05 bila ada).
- **Tata letak sosial media berbeda-beda per template** — mis. baris horizontal di
  bawah, tumpukan vertikal di sisi, kelompok di sudut, atau satu baris minimalis.

---

## Arahan Visual per Template (WAJIB beda satu sama lain)

Gunakan sebagai arah desain; kamu (sebagai desainer) yang menentukan detail piksel,
tapi **jangan menyamakan** tata letak logo/sosial/pattern antar template.

1. **Pengumuman** — header band tebal berwarna brand di atas; logo kiri atas;
   sosial media baris horizontal di footer bawah dengan ikon.
2. **Promo Harga** — bentuk dekoratif diagonal/burst; **harga sangat besar** sebagai
   fokus; logo kanan atas; sosial media kelompok di sudut bawah kanan; ada CTA.
3. **Rekrutmen / Lowongan** — layout terbagi (foto di satu sisi, teks daftar posisi
   di sisi lain); logo tengah atas; sosial media tumpukan vertikal di sisi.
4. **Ucapan / Selamat** — **pola dekoratif** (geometris/konfeti) sebagai ciri khas;
   ucapan besar di tengah; logo bawah tengah; sosial media minimalis satu baris.
5. **Edukasi / Tips** — gaya kartu/daftar bernomor rapi, **minimalis tanpa pattern
   berat**; logo kecil di sudut; sosial media satu baris tipis.
6. **Testimoni / Review** — tanda kutip besar sebagai motif; kartu berisi kutipan +
   nama; logo kecil; sosial media di bawah.
7. **Produk / Menu** — **gambar dominan penuh (full-bleed)**, teks overlay minimal +
   scrim; **BLANK/polos, tanpa pattern**; logo kecil di sudut; sosial media satu
   baris tipis di bawah.
8. **Event / Acara** — gaya tiket/banner; **blok tanggal/waktu/lokasi menonjol**;
   border/pattern bertema; logo atas; sosial media di footer.
9. **Quote / Motivasi** — **sangat minimalis / blank**, teks kutipan besar di tengah,
   latar bersih atau gambar dengan overlay; logo & sosial media sangat kecil/halus.
10. **Profil / Perkenalan** — foto (mis. bingkai bulat), nama + peran; logo di
    header; **sosial media sebagai baris ikon** yang menonjol (karena ini perkenalan).

Minimal **2–3 template dibuat polos/minimalis tanpa pattern** (mis. Produk, Quote,
Edukasi), sisanya boleh berpola — supaya ada keragaman jelas antara "ramai" dan "bersih".

---

## Kriteria Terima (Acceptance)
- 10 template terlihat **jelas berbeda** satu sama lain — bukan satu desain yang
  digeser. Bandingkan: posisi logo, tata letak sosial media, dan pola visual harus
  berbeda antar template.
- Sosial media tampil dengan **ikon platform** (inline SVG), maksimal 3 terpilih,
  tata letaknya bervariasi per template.
- Ada template berpola DAN template polos/minimalis.
- Semua tetap render jadi PNG 1080×1350 tanpa error; teks tidak meluber; gambar
  rusak → placeholder.
- Konsisten dengan warna brand spec-04. Dinilai lewat **smoke test manual pemilik**.

---

## Test yang Harus Ada
- **Unit/render:** ke-10 template render jadi buffer PNG non-kosong (loop).
- **Unit:** footer menampilkan tepat ≤3 sosial terpilih beserta ikonnya.
- **Unit (anti-seragam):** verifikasi antar template BERBEDA pada minimal properti
  kunci — mis. posisi/box slot logo & slot sosial media tidak identik di semua
  template (deteksi kalau desainnya "copy-paste").
- Test lama tetap hijau. Assertion bermakna.

---

## Deliverable (perkiraan)
```
lib/templates/            # 10 definisi template yang benar-benar beragam
lib/social/icons.tsx      # ikon SVG per platform
lib/templates/index.ts    # daftar template
app/generate/page.tsx     # form dinamis mengikuti slot template terpilih
__tests__/...
```

## Smoke Test Manual (untuk pemilik)
1. `npm run dev`, buka `/generate`.
2. Coba tiap template: pastikan **tampilannya beda-beda** (logo, sosial, pola),
   bukan cuma konten pindah.
3. Cek sosial media muncul sebagai ikon (3 terpilih), tata letaknya beda per template.
4. Pastikan ada yang berpola dan ada yang polos/minimalis.
5. Tandai mana yang sudah bagus & mana yang masih perlu dibedakan lagi.

## Catatan
Fokus utama spec ini: **keragaman desain nyata + ikon sosial media**. Kalau setelah
jadi masih ada template yang terasa mirip, tinggal minta perbaikan pada yang itu saja.
