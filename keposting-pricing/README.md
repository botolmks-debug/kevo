# Keposting Pricing — Files untuk Lolos Review Midtrans

Tujuan: menampilkan harga di landing page keposting.com agar reviewer Midtrans melihat
"ada produk + harga jelas" — syarat wajib yang dulu belum terpenuhi (halaman lama
cuma bilang "Gratis Diakses" + "Top-up berbayar akan aktif dalam beberapa minggu").

## Isi zip

```
components/PricingSection.tsx     ← komponen baru, tempel ke landing page
lib/payment/packages.ts           ← ganti file lama dengan yang ini
README.md                         ← file ini
```

---

## Langkah 1 — Salin file

Salin folder `components/` dan `lib/` ke root proyek Keposting.
Kalau `lib/payment/packages.ts` sudah ada, **timpa** (Ctrl+A → paste).

## Langkah 2 — Pakai `PricingSection` di landing page

Buka `app/page.tsx` (halaman utama keposting.com).

Di paling atas file, tambahkan import:

```tsx
import PricingSection from "@/components/PricingSection";
```

Cari blok "Coba gratis, tanpa risiko" (yang isinya
`✓ 10 token gratis saat daftar`, dst).

Di **bawah** blok itu, tambahkan:

```tsx
<PricingSection />
```

Sekaligus **hapus** kalimat ini di blok lama:

> Top-up berbayar akan aktif dalam beberapa minggu untuk kamu yang butuh lebih banyak konten.

Kalimat itu justru sinyal ke reviewer bahwa belum ada transaksi berjalan.

## Langkah 3 — Update jawaban FAQ "Berapa harganya?"

Cari FAQ di landing page. Ganti jawabannya jadi:

> Kamu dapat 10 token gratis saat daftar (+1/hari, maks 5). Kalau butuh lebih,
> top-up mulai Rp 50.000 untuk 10 token, Rp 135.000 untuk 30 token,
> atau Rp 240.000 untuk 60 token. Sekali bayar, tanpa langganan, token tidak hangus.

## Langkah 4 — Simpan semua file (Ctrl+S) & deploy

- Pastikan `app/page.tsx`, `components/PricingSection.tsx`, dan
  `lib/payment/packages.ts` semuanya tersimpan sebelum push.
- Push ke GitHub → Vercel auto-deploy.
- Buka https://www.keposting.com dan cek: section harga muncul, angka benar,
  tombol "Pilih Paket" masuk ke /signup.

## Langkah 5 — Kabari Midtrans

Setelah deploy sukses, login ke dashboard Midtrans → chat support,
atau email support@midtrans.com. Tulis singkat:

> "Halo, akun Merchant [Nama Bisnis / Merchant ID] pengajuan aktivasi
> saya masih dalam review. Saya sudah memperbarui website
> https://www.keposting.com dengan informasi harga produk yang jelas
> (3 paket top-up token). Mohon review dapat dilanjutkan. Terima kasih."

Biasanya setelah info harga tayang, review lanjut dalam 1–3 hari kerja.

---

## Catatan penting soal `packages.ts`

File `lib/payment/packages.ts` di proyek lama kamu isinya 4 paket lama:
`5tok/25rb, 10tok/45rb, 20tok/80rb, 30tok/115rb`. File di zip ini
**mengganti** dengan 3 paket baru: `10tok/50rb, 30tok/135rb, 60tok/240rb`.

Kalau halaman `/topup` (`app/topup/page.tsx`) baca dari `TOPUP_PACKAGES`,
otomatis ikut update. Kalau ada tempat lain yang hardcode harga lama
(cek pencarian teks "25000", "45000", "80000", "115000" di seluruh proyek),
ganti manual.

Field baru di `TopupPackage`:
- `pricePerToken` — untuk tampilan "Rp X/konten"
- `highlight?: boolean` — paket populer (dipakai badge di UI)
- `description?: string` — subteks kecil

Fungsi helper baru: `getPackageById(id)` dan `formatIdr(amount)`.
