# Banner "Galeri Kosong" — Cara Pasang

PENTING: ZIP ini berisi AutoGenerate.tsx yang SUDAH TERMASUK fitur Carousel v2.
Jadi extract kevo-carousel-v2.zip DULU, baru ZIP ini (atau langsung ZIP ini
kalau v2 sudah terpasang). Jangan urutan terbalik — nanti banner ketimpa.

File:
- components/ui/EmptyGalleryNotice.tsx  (BARU — banner reusable)
- app/generate/page.tsx                 (Buat Konten: banner di halaman pilih model)
- app/generate-otomatis/AutoGenerate.tsx (Otomatis: banner di bawah pilihan jenis)

Perilaku:
- Banner muncul hanya kalau daftar gambar SELESAI dimuat DAN kosong
  (tidak berkedip saat loading).
- Isi: "Belum ada foto produk di galerimu" + tombol "Upload Foto Produk →"
  yang link langsung ke /dashboard. Ikut bahasa UI (ID/EN).
- Di Otomatis, banner tampil untuk jenis Dari Foto, Referensi, dan Carousel
  (General & Interaksi tidak butuh foto, jadi tidak diganggu banner).
- Di Buat Konten, banner tampil di halaman pilih model (sebelum masuk model).

Setelah extract: restart dev server.
