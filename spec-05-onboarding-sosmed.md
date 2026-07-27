# Spec Irisan 05 — Onboarding: Pertanyaan Bisnis + Sosial Media Fleksibel

Serahkan ke Claude Code. Patuhi `CLAUDE.md`. Membangun di atas spec-04 (halaman
`/onboarding` sudah ada). Dua perubahan: (A) sosial media fleksibel, (B) set
pertanyaan bisnis yang lebih matang.

---

## PERAN
Untuk bagian pertanyaan, kamu berperan sebagai **ahli komunikasi marketing** —
pertanyaan sudah dirancang di bawah; tugasmu memasangnya dengan rapi dan
menyimpan jawabannya secara terstruktur agar mudah dibaca AI di irisan berikutnya.

---

## BAGIAN A — Sosial Media Fleksibel

**Masalah sekarang:** onboarding hanya menyediakan 3 sosial media, dan footer
template menampilkan semuanya.

**Yang diinginkan:**
1. Di onboarding, sediakan **daftar banyak platform yang umum di Asia**. User
   boleh mengisi handle/nomor untuk platform mana pun yang mereka pakai
   (kosongkan yang tidak dipakai). Minimal sediakan pilihan berikut:
   - Instagram, WhatsApp, Facebook, TikTok, YouTube, X (Twitter), LINE,
     Telegram, Threads, LinkedIn, WeChat, Xiaohongshu (RED), KakaoTalk, Zalo,
     Shopee, Tokopedia, Lazada, Website.
   (Boleh ditambah bila ada yang relevan; buat daftarnya mudah diperluas di kode.)
2. **Footer template konten tetap ringkas — hanya menampilkan maksimal 3 sosial
   media.** User **memilih 3** dari yang mereka isi untuk ditampilkan (untuk
   menjaga ruang & kerapian). Beri UI pemilihan yang jelas (mis. tandai 3 yang
   akan tampil).
3. Footer semua template (yang ada sekarang & 10 template nanti di spec-03) harus
   merender **hanya 3 sosial media terpilih** itu (ikon/label + handle), bukan
   semua.

---

## BAGIAN B — Set Pertanyaan Onboarding (ganti pertanyaan lama)

Susun onboarding bertahap (boleh pertahankan gaya langkah/progress yang sudah
ada). **Urutan: pertanyaan terpandu dulu, cerita bebas di akhir.** Pasang
pertanyaan berikut:

**Langkah 1 — Tentang bisnis**
- Nama bisnis
- Jenis usaha / industri (mis. klinik, kuliner, fashion, jasa)
- Sudah berjalan berapa lama (atau: usaha baru)
- Lokasi / area layanan

**Langkah 2 — Produk & pelanggan**
- Produk/jasa utama yang ditawarkan
- Produk/jasa unggulan yang paling ingin dipromosikan
- Kisaran harga (opsional)
- Target pelanggan (mis. usia, tipe, kebutuhan)
- Masalah pelanggan yang bisnis ini pecahkan

**Langkah 3 — Pembeda & gaya pesan**
- Keunggulan / pembeda dari pesaing (kenapa pelanggan memilih kamu)
- Tujuan utama konten — pilihan bisa lebih dari satu:
  jualan / brand awareness / edukasi / loyalitas pelanggan
- Nada komunikasi yang diinginkan — pilih:
  santai / profesional / hangat / lucu / formal
- Ajakan (CTA) yang biasa dipakai + cara pelanggan memesan/menghubungi
- **Hal yang harus dihindari** (kata, klaim, atau topik pantangan)

**Langkah 4 — Sosial media** (Bagian A di atas: isi handle + pilih 3 untuk tampil)

**Langkah 5 — Unggah gambar bisnis** (pertahankan yang sudah ada: logo, foto
tempat/produk, boleh beberapa)

**Langkah 6 — Cerita usaha (bebas)**
- Textarea besar: "Ceritakan usahamu sedetail mungkin — awal mula, nilai yang
  dipegang, apa yang bikin bangga, dan apa pun yang penting kami tahu." Beri
  petunjuk bahwa makin detail, makin bagus kontennya.

Simpan seluruh jawaban sebagai **satu objek profil bisnis** yang terstruktur
(mis. state/objek `businessProfile`) — rapi dan berlabel jelas per field, supaya
mudah dipakai AI nanti.

---

## Yang TIDAK dikerjakan di sini (irisan berikutnya)
- Menyimpan profil ke database (masih di state dulu; belum ada auth/DB).
- AI membaca jawaban untuk menggenerate konten — itu irisan setelah auth+DB.
- Perubahan tetap dalam gaya premium spec-04 (jangan bikin gaya baru).

---

## Kriteria Terima (Acceptance)
- Onboarding menampilkan daftar sosial media lengkap (≥ daftar di atas); user
  bisa isi banyak, lalu memilih tepat/maksimal 3 untuk ditampilkan.
- Footer template merender hanya 3 sosial media terpilih, rapi, tidak meluber.
- Pertanyaan onboarding sesuai set di atas, bertahap, cerita bebas di akhir.
- Jawaban tersimpan sebagai objek profil terstruktur (bisa dilihat, mis. di
  console/log saat "Lanjut", untuk membuktikan datanya tertangkap).
- Semua tetap bergaya premium spec-04 dan alur klik tetap jalan.

---

## Test yang Harus Ada
- **Unit:** memilih >3 sosial media dicegah / hanya 3 yang tersimpan untuk tampil.
- **Unit:** objek profil bisnis terbentuk benar dari isian form (field terpetakan).
- **Render/unit:** footer template hanya menampilkan 3 sosial terpilih.
- Test lama tetap hijau (tanpa regresi). Assertion bermakna.

---

## Deliverable (perkiraan)
```
app/onboarding/page.tsx        # pertanyaan baru + sosial media + pilih 3
lib/social/platforms.ts        # daftar platform (mudah diperluas)
lib/templates/...              # footer render 3 sosial terpilih
__tests__/...
```

## Smoke Test Manual (untuk pemilik)
1. `npm run dev`, buka `/onboarding`.
2. Isi pertanyaan tiap langkah; di sosial media, isi beberapa lalu pilih 3.
3. Sampai akhir → cek data profil tertangkap (log/console).
4. Buka `/generate`, render satu konten → pastikan footer menampilkan 3 sosial
   terpilih dengan rapi.
