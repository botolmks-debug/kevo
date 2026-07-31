# (Isi ini ke CLAUDE.md di repo Kevo — gabung dengan isi CLAUDE.md yang sudah ada)

## Apa itu Kevo
Layanan generate konten sosial media untuk banyak bisnis (UMKM & instansi).
Versi multi-tenant dari sistem konten Botol Makassar yang sudah terbukti.

## Mode UTAMA = OTOMATIS (ini pembeda Kevo)
Alur inti: klien onboarding **sekali** (profil bisnis, target market, sosmed,
database gambar + deskripsi) → **SISTEM yang auto-generate** konten (gambar +
caption, idealnya beralur hook → build-up → closing seperti Botol Makassar) →
konten masuk **antrean review** klien → klien tinggal review, edit seperlunya,
lalu posting. **Beban klien harus kecil.** AI diposisikan sebagai "ahli
marketing", bukan tool desain.

## SEKUNDER — jangan dijadikan alur utama
`/generate` manual (pilih template + ketik + generate satu-satu), AI-compose
gambar (regenerate/scene), dan editor layer geser-geser. Semua ini fitur
tambahan/opsional dan/atau ditunda. JANGAN jadikan pusat produk.

## Aturan penting
- Foto asli fasilitas/produk spesifik (mesin, ruangan RS) dipakai **apa adanya**
  — jangan difabrikasi/diregenerate jadi objek palsu. AI-transform hanya untuk
  gambar yang ditandai "boleh diolah AI".
- **Tidak ada panggilan AI berbayar (Gemini) otomatis diam-diam** — hanya lewat
  aksi eksplisit + pengaman biaya. Saldo Gemini pernah terkuras di Botol
  Makassar.
- Semua tulis ke DB lewat service-role, bukan anon. Render pakai Satori
  (deterministik). API key = tugas Andri; agent tidak menyentuh `.env`.

## GOLDEN RULE untuk agent
Kalau sebuah tugas mendorong Kevo ke arah "tool manual sebagai alur utama",
**berhenti dan konfirmasi ke Andri dulu** — itu bertentangan dengan mode utama
otomatis. Jangan diam-diam menumpuk fitur manual.
