# Spec — Editor Kanvas (Layer Geser-geser) Kevo

Milestone ini membawa editing ala Botol Makassar (`/preview`) ke Kevo: konten
bukan lagi PNG terkunci hasil Satori, tapi **dokumen berlapis (layer)** di atas
kanvas yang bisa digeser, diubah ukuran, dan diedit teksnya sebelum diekspor
jadi PNG.

Kerjakan **setelah** perbaikan render (fit gambar, mode tanpa-template,
auto-pilih poin 5, logo selalu ikut) selesai dan hijau di test/lint/typecheck.

---

## 1. Keputusan arsitektur (paling penting, baca dulu)

**Sumber kebenaran visual = satu dokumen layout berbentuk JSON**, bukan PNG dan
bukan markup Satori.

Alur lama: form → Satori render → PNG (terkunci).
Alur baru: form → generator bikin **layout JSON** awal → editor kanvas memuat &
mengubah JSON itu → export JSON jadi PNG.

Kenapa begini:
- Auto-generate (poin 5, matching, logo, template) dan edit manual jadi
  memodifikasi **objek yang sama** (layout JSON). Tidak ada dua jalur render yang
  bisa berbeda hasil.
- Konten bisa dibuka & diedit lagi kapan saja (tinggal muat JSON-nya).
- Template = **preset susunan layer** (posisi awal), bukan bingkai yang mengunci.

Konsekuensi: Satori tidak lagi jadi renderer utama untuk konten yang diedit
manusia. Kalau nanti butuh render batch tanpa editor (mis. cron), render dari
**layout JSON yang sama** supaya tidak divergen — jangan bikin schema kedua.

---

## 2. Pilihan teknologi

Rekomendasi utama: **react-konva** (wrapper React untuk Konva.js). Cocok dengan
Next.js, punya drag + transformer (handle resize/rotate) bawaan, export ke PNG
via `stage.toDataURL({ pixelRatio })`.

Alternatif: **Fabric.js** — editing teks inline-nya lebih matang, tapi
integrasinya ke React lebih manual.

Catatan react-konva: edit teks dilakukan dengan menimpakan `<textarea>` HTML di
atas node teks saat double-click (Konva tidak punya text-edit inline) — ini pola
standar, tapi harus dibangun, jangan dilupakan.

Keputusan ini boleh Claude Code timbang ulang di tahap rencana, tapi jangan
pakai html2canvas + drag manual — drag/resize/rotate dari nol di DOM bakal
berantakan.

---

## 3. Model data — Layout Document

Simpan per baris konten (kolom `layout jsonb` di tabel konten). Struktur:

```
{
  "version": 1,
  "canvas": {
    "ratio": "4:5" | "1:1" | "9:16",
    "width": 1080, "height": 1350,      // resolusi export penuh
    "background": { "type": "solid"|"image-blur", "value": "#0b1220" }
  },
  "layers": [
    {
      "id": "img-1",
      "type": "image",
      "src": "<url dari Database Gambar>",
      "imageId": "<id baris di DB, untuk swap>",
      "x": 0, "y": 220, "w": 1080, "h": 720,
      "rotation": 0, "z": 1,
      "fit": "cover" | "contain",
      "locked": false
    },
    {
      "id": "text-headline",
      "type": "text",
      "content": "asas",
      "x": 60, "y": 60, "w": 960, "h": 160,
      "rotation": 0, "z": 3,
      "font": "Inter", "size": 72, "weight": 700,
      "color": "#ffffff", "align": "left", "lineHeight": 1.1,
      "locked": false
    },
    {
      "id": "logo",
      "type": "logo",
      "src": "<url logo bisnis>",
      "x": 60, "y": 1180, "w": 120, "h": 120,
      "rotation": 0, "z": 10,
      "alwaysOn": true, "locked": false
    }
  ]
}
```

Aturan:
- Koordinat & ukuran memakai sistem **resolusi export penuh** (mis. 1080×1350),
  bukan piksel layar. Editor menampilkannya dengan skala (lihat §6 export).
- `type: "logo"` selalu ada (`alwaysOn: true`) di setiap layout — dibuat oleh
  generator, tidak masuk pool matching. Boleh dipindah, tidak boleh dihapus.
- Layer `z` menentukan urutan tumpuk.

---

## 4. Alur generate → editor

1. User isi form (template, ukuran, headline, isi) → klik **Generate**.
2. Backend membangun **layout JSON awal**:
   - `canvas` sesuai ukuran terpilih.
   - Layer gambar dari hasil matching poin 5 (bisa >1). Kalau tanpa template →
     satu layer gambar full-bleed. Kalau zero-match → tanpa layer gambar (slot
     kosong + opsi generate AI, tetap manual).
   - Layer teks (headline, isi) sesuai preset template.
   - Layer logo (selalu).
3. Buka editor kanvas dengan JSON itu. User boleh langsung posting/ekspor, atau
   geser-geser dulu.

Template lama diubah jadi **fungsi builder** yang menghasilkan susunan layer
awal (posisi/font/warna default per jenis template), bukan komponen bingkai.

---

## 5. Fitur editor

### MVP (wajib di milestone ini)
- Kanvas menampilkan rasio aktif; ganti rasio (4:5 / 1:1 / 9:16) menata ulang
  layer secara proporsional (atau minimal tidak merusak — lihat catatan).
- Pilih layer → **geser** (drag) untuk pindah.
- **Handle sudut** untuk ubah ukuran; jaga rasio gambar saat resize (shift-lock
  opsional).
- Layer teks: **double-click untuk edit teks**; ubah ukuran font, warna, tebal,
  perataan (kiri/tengah/kanan).
- Layer gambar: **ganti gambar** (buka picker Database Gambar), ubah `fit`
  (cover/contain), geser posisi gambar dalam frame.
- Logo: bisa dipindah, tidak bisa dihapus.
- Urutan layer: maju/mundur (bring forward / send back).
- Tambah layer teks baru; hapus layer (kecuali logo).
- **Export PNG** di resolusi penuh.
- **Simpan** layout JSON ke DB; **buka lagi** untuk edit ulang.

### Menyusul (jangan di milestone ini)
- Undo/redo berlapis, snap guide & garis bantu perataan, multi-select, rotate
  presisi, galeri template lebih banyak, background blur otomatis dari gambar,
  editor versi mobile.

Catatan ganti rasio: cara paling aman untuk MVP = tiap template punya preset
posisi per rasio (3 varian). Auto-reflow layer sembarang ke rasio lain itu rumit
— pakai preset dulu, reflow pintar ditunda.

---

## 6. Export PNG (titik paling rawan)

- Render dari layout JSON di resolusi penuh (`canvas.width` × `height`), bukan
  ukuran tampilan. Di Konva: tampilkan stage terskala di layar, lalu export
  dengan `pixelRatio = width_penuh / width_tampilan` agar hasilnya tajam 1080px+.
- **CORS — ini yang paling sering bikin export gagal/gelap.** Gambar dari
  Supabase Storage harus disajikan dengan header CORS yang benar **atau** diproxy
  lewat origin yang sama. Kalau tidak, kanvas jadi *tainted* dan `toDataURL`
  dilempar error keamanan. Pasang `crossOrigin="anonymous"` saat memuat gambar
  dan pastikan bucket/proxy mengizinkan. Uji ini lebih awal, jangan di akhir.
- **Font harus konsisten** antara editor dan export. Muat font (mis. Inter)
  sebelum render/ekspor (tunggu `document.fonts.ready`), kalau tidak teks bisa
  bergeser/berganti font di PNG.
- Ukur wrap teks di editor dengan cara yang sama seperti saat render final biar
  posisi baris tidak berubah pas diekspor.

---

## 7. Persistensi & riwayat

- Tambah kolom `layout jsonb` di tabel konten (nullable untuk baris lama).
- Simpan layout tiap kali user menyimpan/ekspor.
- Tombol **Edit** di daftar konten memuat ulang editor dari `layout`. Ini
  sekaligus mengisi fitur "Daftar Konten / Editor Tata Letak" yang selama ini
  berstatus *segera hadir*.
- Semua tulis lewat route service-role (konsisten dengan aturan proyek), jangan
  anon.

---

## 8. Di luar cakupan (biar milestone tidak melar)

Animasi, video, gambar freehand/brush, filter foto lanjutan, kolaborasi
real-time, dan editor mobile — semua ditunda. Fokus: desktop, PNG statis,
layer dasar (gambar/teks/logo).

---

## 9. Urutan build yang disarankan

1. Definisikan schema layout JSON + migrasi kolom `layout`.
2. Ubah template jadi builder yang menghasilkan layout JSON awal (belum ada
   editor — cukup pastikan JSON → render statis benar).
3. Pasang kanvas react-konva read-only yang me-render dari JSON (samakan hasilnya
   dengan render lama). **Uji export PNG + CORS di titik ini.**
4. Tambah interaksi: select → drag → resize.
5. Tambah edit teks (overlay textarea) + kontrol font/warna/align.
6. Tambah swap gambar + fit + urutan layer + tambah/hapus teks.
7. Simpan/muat layout dari DB + tombol Edit di daftar konten.
8. Rapikan (kunci logo, batasan kanvas, dll).

Tiap langkah: jaga test/lint/typecheck hijau. Sebelum ngoding tiap langkah besar,
tunjukkan rencana file yang disentuh dulu — jangan apply sampai di-acc.
