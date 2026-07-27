# Spec — Perbaikan Render & AI-Compose `/generate` Kevo

Spec ini punya **dua bagian**:

- **Bagian A — Perbaikan render (deterministik, TANPA AI).** Cepat, wajib
  duluan. Membetulkan gambar kepotong, mode tanpa-template, auto-pilih gambar,
  dan logo. Ini yang membetulkan tampilan jelek yang kelihatan sekarang.
- **Bagian B — AI susun ulang gambar (scene menarik dari target market).**
  Fitur besar & mahal. Menghasilkan gambar hasil compose; **Bagian A yang
  menaruhnya** di kanvas.

**Urutan wajib:** selesaikan & hijaukan Bagian A dulu (test/lint/typecheck), baru
kerjakan Bagian B. Bagian A tidak bergantung pada Bagian B. Sebelum ngoding tiap
langkah besar, tunjukkan rencana file yang disentuh; jangan apply sampai di-acc.

---

# BAGIAN A — Perbaikan Render (tanpa AI)

Konteks: form `/generate` sudah punya template, pilihan ukuran (4:5 / 1:1 /
9:16), dan Database Gambar. Render lewat Satori → PNG. Empat hal berikut belum
benar.

## A1. Perbaiki gambar kepotong — TANPA AI
Masalah: gambar `object-fit: cover` dipaksa mengisi kotak → sisi lebihnya
dipotong. Ini masalah layout, bukan perlu AI.
- **Dengan template:** gambar `object-fit: contain` (utuh, tidak kepotong) + isi
  celah dengan **background blur** dari gambar yang sama di belakangnya.
- **Tanpa template:** gambar full-bleed `cover` menutup seluruh kanvas.
- **JANGAN pakai AI** untuk memperbaiki crop. (Regenerate = Bagian B, konteks
  beda.)

## A2. Mode "Tanpa Template" benar-benar tanpa frame
Masalah: saat "Tanpa Template" dipilih, render masih memunculkan frame.
- Jalur render terpisah: **gambar full-bleed** memenuhi kanvas + teks
  (headline & isi) sebagai **overlay** (mis. gradient gelap tipis di bawah biar
  terbaca), tanpa pattern/frame.
- Logo tetap overlay (lihat A4).

## A3. Auto-pilih gambar dari deskripsi — buang dropdown manual
Masalah: gambar masih dipilih manual lewat dropdown "Foto (opsional)".
- **Buang field "Foto (opsional)" dari form.**
- Ambil semua gambar bisnis dari Database Gambar (**service-role**, bukan anon).
- Teks yang dicocokkan: Headline + Isi.
- Algoritma (per kata utuh, bukan substring):
  1. Normalisasi: lowercase, buang tanda baca, pecah jadi token per kata.
  2. Buang stopword ID (min: `yang, di, ke, dari, dan, untuk, ini, itu, sudah,
     bisa, akan, ada, dengan, pada, atau, juga`).
  3. Skor = jumlah token sama persis (`===`), bukan `includes()`, supaya `aj02`
     ≠ `aj01`.
  4. Ambil semua gambar dengan **skor tertinggi (>0)**, termasuk yang seri.
- Dukung >1 gambar per kartu.
- Zero-match → render tanpa gambar + tombol **"Generate gambar AI"** manual
  (memicu Bagian B); jangan auto.

## A4. Logo selalu diikutkan
- Logo bisnis selalu tampil sebagai overlay (mis. pojok) di semua ukuran & mode
  (termasuk tanpa template).
- Logo TIDAK ikut pool matching A3 — layer tetap, bukan hasil pencarian.

---

# BAGIAN B — AI Susun Ulang Gambar (Scene dari Target Market)

Tujuan: gambar produk tidak sekadar tampil apa adanya, tapi disusun ulang jadi
**scene menarik** yang latarnya menyesuaikan **target market** bisnis.

## B0. Status & prasyarat
- Regenerate **belum pernah dibangun** (selama ini di-stub). Bagian ini yang
  mendefinisikannya — ini fitur baru, bukan perbaikan bug.
- Butuh akses **model image Gemini** + `GEMINI_API_KEY` (tugas Andri; Claude Code
  tidak menyentuh `.env`). **Pengaman biaya wajib dari awal** — ingat pengalaman
  Botol Makassar: saldo Gemini sempat terkuras & image model sering 503.

## B1. Kontrol per-gambar (pakai toggle yang SUDAH ada)
Di dashboard sudah ada pilihan **"Perlakuan gambar: Apa adanya (dipakai
langsung) / Boleh diolah AI"**. Pakai itu sebagai saklar:
- **"Apa adanya"** → lewati Bagian B sepenuhnya. Gambar asli langsung dipakai di
  render (Bagian A). (Ini untuk foto fasilitas/lingkungan nyata — mis. RS upload
  foto ruangannya — yang harus tampil autentik.)
- **"Boleh diolah AI"** → gambar ini masuk pipeline compose Bagian B.

## B2. Aturan perlakuan objek (fidelitas)
- **Default (aman untuk semua): pertahankan objek asli.** Objek utama di-cutout
  (background removal), lalu AI hanya menggenerate **latar/scene di
  sekelilingnya**. Objeknya TIDAK dikarang ulang.
- **Regenerate objek penuh** (bersihkan label lama → pasang label baru, ubah
  tampilan) hanya sebagai **opsi opt-in khusus produk kemasan kecil** (botol,
  dus, tas). MATIKAN secara default.
- **Peralatan/fasilitas besar & spesifik** (mesin vending, ruangan): **tidak
  boleh** regenerate penuh — hanya default B2 (objek asli dipertahankan, AI garap
  latar). Alasan: seluruh pesan konten bergantung pada objek yang benar; model
  image mudah menghasilkan objek kompleks yang salah/bukan miliknya.

## B3. Sumber latar = TARGET MARKET
- Ambil **target market** dari data onboarding (pertanyaannya sudah ada).
- Jadikan input utama prompt latar; kombinasikan dengan profil bisnis.
- Latar **tidak dipatok tetap** (bukan selalu cafe seperti Botol Makassar). AI
  menentukan lingkungan yang sesuai target market. Contoh:
  - UMKM umum → cafe / rumah makan / warung kopi.
  - Target anak muda + usaha parfum → toko/rak kosmetik yang ramai anak muda.
- Boleh acak beberapa variasi sudut/latar dalam koridor target market itu.

## B4. Pipeline (usulan)
1. Ambil foto hasil matching (A3).
2. Jika toggle = "Apa adanya" → skip, langsung render (A).
3. Jika "Boleh diolah AI":
   a. Cutout / background removal objek utama.
   b. Susun prompt latar dari target market + profil bisnis (B3).
   c. Generate/inpaint scene di belakang objek yang dipertahankan.
   d. (Opsional, opt-in, produk kemasan kecil) transform objek: bersihkan label
      lama, pasang label baru.
   e. Serahkan hasil komposit ke render Bagian A (ditaruh full-bleed / fit).
- Model: Gemini image (image editing/inpainting), seperti Botol Makassar. Detail
  API dipilih Claude Code saat rencana.

## B5. Pengaman biaya & keandalan (wajib)
- **Tidak ada auto-generate diam-diam** — hanya jalan lewat aksi eksplisit user
  (mis. tombol "Generate gambar AI").
- Batasi jumlah generate; hitung/pantau pemakaian.
- Retry berjeda untuk 503 (mis. 3/6/10 detik), seperti Botol Makassar.
- **Cache** hasil agar konten yang sama tidak digenerate ulang.
- Kalau AI gagal → **fallback ke foto asli apa adanya**, jangan gagal total.

## B6. Tantangan yang harus diantisipasi (jujur, bukan bug)
- **Blending:** pencahayaan, bayangan, dan skala objek asli harus cocok dengan
  latar AI — kalau tidak, kelihatan "ditempel". Perlu iterasi prompt.
- Objek besar (mesin vending) lebih sulit dicocokkan skala & perspektifnya
  daripada botol kecil — antisipasi hasil awal belum sempurna.
- Jaga cutout tidak merusak objek; jangan biarkan model mengubah objek yang harus
  dipertahankan (B2).

---

## Hubungan ke spec editor kanvas
Setelah A & B beres, "layout JSON" di `spec-editor-kanvas-kevo.md` dibangun dari
susunan yang sama (gambar hasil matching/compose + logo overlay + teks). Rapikan
struktur render di sini supaya gampang diangkat jadi layer nanti.
