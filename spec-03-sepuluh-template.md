# Spec Irisan 03 — 10 Template Dasar (dengan Peran Desainer)

Kerjakan setelah spec-02 selesai. Serahkan ke Claude Code. Patuhi `CLAUDE.md`.
(Catatan urutan: auth & onboarding menyusul di spec-04 dan seterusnya.)

---

## PERAN (baca ini dulu, penting)

Untuk tugas ini, **kamu berperan sebagai desainer grafis senior + ahli
komunikasi marketing**, bukan sekadar penulis kode. Setiap template yang kamu
buat harus merupakan keputusan desain yang matang, bukan kotak-kotak asal
tempel. Kamu membuat "kerangka desain" yang akan dipakai berulang oleh banyak
bisnis, jadi kualitas dan konsistensinya menentukan citra produk.

Kamu tidak bisa melihat hasil gambarnya, jadi patuhi prinsip-prinsip di bawah
sebagai penggantimu "melihat".

---

## Prinsip Desain (WAJIB diikuti tiap template)

1. **Hierarki visual jelas.** Headline paling dominan; mata harus langsung ke
   sana. Elemen lain mendukung, tidak bersaing.
2. **Kontras & keterbacaan.** Teks harus kontras tinggi dengan latarnya. Jika
   teks berada di atas gambar, beri lapisan gelap/terang (scrim/overlay) supaya
   tetap terbaca. Jangan pernah teks tipis di atas gambar ramai.
3. **Ruang kosong (white space).** Beri napas. Jangan penuhi setiap sudut.
   Sesak = murah.
4. **Palet warna terbatas.** 2–3 warna + netral, satu warna aksen yang jelas.
   Konsisten dalam satu template.
5. **Tipografi berjenjang.** 1–2 jenis huruf saja. Ukuran headline, subjudul,
   isi, dan footer harus jelas beda tingkatannya.
6. **Grid & alignment.** Semua elemen rata pada garis yang konsisten. Tidak ada
   yang "mengambang" sembarang.
7. **Safe margin.** Elemen penting tidak mepet tepi kanvas (beri margin aman).
8. **Fokus tunggal.** Satu pesan utama per konten. Jangan menjejalkan banyak ide.
9. **Konsistensi brand.** Slot brand (logo, badge, footer identitas) berada di
   posisi yang konsisten antar template sehingga terasa satu keluarga.

## Prinsip Komunikasi Marketing (untuk struktur slot & teks contoh)

- Template yang menjual (promo, event, rekrutmen) **wajib punya slot CTA** yang
  jelas (mis. "Daftar sekarang", "Hubungi WA").
- Angka penting (harga, tanggal, jumlah) diberi slot yang **menonjol**.
- Teks contoh/placeholder yang kamu isi harus berorientasi manfaat & ringkas —
  contoh copy yang baik, bukan "lorem ipsum".

---

## Tujuan

Buat **10 template dasar** yang bisa dipilih user di halaman `/generate` dan
dipakai berulang. Semua memakai **mesin render dari spec-01** (bentuk data
`Template` + `Slot` yang sudah ada) — jangan bikin mesin baru. Kamu yang
mendesain tata letak tiap template (posisi, ukuran, warna, slot) mengikuti
prinsip di atas.

Kanvas semua template: **1080 × 1350** (portrait, aman untuk feed Instagram).
Semua punya slot brand konsisten: logo (kiri atas), badge (kanan atas), footer
identitas (bawah: nama + kontak + handle).

---

## 10 Template yang Harus Dibuat

Untuk tiap template: tentukan slot teks & gambar yang sesuai, desain tata
letaknya, dan isi teks contoh yang masuk akal.

1. **Pengumuman** — headline besar + teks isi + 1 gambar. (Boleh sempurnakan
   `example-pengumuman` yang sudah ada, jadikan salah satu dari 10.)
2. **Promo Harga / Penawaran** — label "PROMO", nama penawaran, **slot harga
   sangat menonjol**, gambar produk, slot CTA (mis. "Pesan via WA").
3. **Rekrutmen / Lowongan** — judul "OPEN RECRUITMENT", **slot daftar posisi**
   (beberapa baris), gambar/foto pendukung, slot CTA kontak.
4. **Ucapan / Selamat** — nuansa perayaan (mis. ulang tahun / hari besar), slot
   ucapan besar, slot nama/tanggal, gambar opsional.
5. **Edukasi / Tips** — judul topik + **daftar poin bernomor** (mis. 3–5 tips),
   gambar opsional. Rapi dan mudah dibaca.
6. **Testimoni / Review** — **kutipan besar** sebagai fokus, nama & peran pemberi
   testimoni, opsi indikator rating, foto kecil opsional.
7. **Produk / Menu** — **foto produk dominan**, nama produk, harga, deskripsi
   singkat.
8. **Event / Acara** — judul acara, **slot tanggal/waktu/lokasi yang menonjol**,
   gambar, slot CTA daftar.
9. **Quote / Motivasi** — **kutipan besar terpusat**, atribusi (nama sumber),
   latar bersih atau gambar dengan overlay.
10. **Profil / Perkenalan** — foto orang/tim, nama, peran/jabatan, deskripsi
    singkat.

---

## Halaman Generate (penyesuaian)

- Dropdown template di `/generate` menampilkan **ke-10 template**.
- Saat user memilih template, **form menyesuaikan** — hanya menampilkan field
  yang relevan untuk slot template itu (mis. template Promo menampilkan field
  Harga & CTA; template Tips menampilkan field poin-poin). Bangun form secara
  dinamis dari daftar slot template yang dipilih.
- Selebihnya alur sama seperti spec-02: isi field → Generate → PNG tampil →
  Download.

---

## Kriteria Terima (Acceptance)

- Ke-10 template muncul di dropdown dan bisa dipilih.
- Memilih template mengubah field form sesuai slotnya.
- Tiap template bisa di-render jadi PNG 1080×1350 tanpa error; slot brand
  (logo/badge/footer) selalu di posisi konsisten.
- Headline/teks panjang tidak meluber (clamp), gambar rusak → placeholder.
- Tiap template terlihat menerapkan prinsip desain di atas (hierarki, kontras,
  ruang kosong) — ini dinilai lewat **smoke test manual oleh pemilik**.

---

## Test yang Harus Ada

- **Unit:** tiap dari 10 template lolos validasi bentuk data `Template`.
- **Unit:** tiap template bisa dirender menghasilkan buffer PNG non-kosong
  berukuran benar (loop 10 template).
- **Unit:** form dinamis menampilkan field yang benar untuk template terpilih.
- Assertion bermakna, bukan test kosong.

---

## Deliverable (perkiraan)

```
lib/templates/                # 10 file definisi template (atau 1 file berisi 10)
lib/templates/index.ts        # daftar semua template agar mudah di-list
app/generate/page.tsx         # dropdown 10 template + form dinamis
__tests__/...                 # test di atas
```

## Smoke Test Manual (untuk pemilik)

1. `npm run dev`, buka `/generate`.
2. Coba **tiap** template: pilih dari dropdown, isi field, tempel URL gambar
   (pakai URL gambar langsung .jpg/.png), Generate.
3. Nilai dengan mata: rapi? hierarki jelas? enak dilihat?
4. Tandai template mana yang sudah bagus dan mana yang perlu diperbaiki.

---

## Catatan Jujur

Sebagai desainer, buat 10 titik-awal yang kuat dan berprinsip. Tapi penilaian
akhir "cantik atau belum" ada di mata pemilik — ini kerangka untuk dikurasi &
dipoles, bukan jaminan 10-10-nya langsung sempurna. Setelah dibuat, pemilik akan
memilih & meminta perbaikan pada yang perlu.
