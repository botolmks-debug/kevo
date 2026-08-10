# Keposting Pricing — v2 (FIX untuk Landing.tsx yang asli)

## Yang berubah dari v1

- **PricingSection.tsx** diperbaiki: pakai design system asli Landing kamu
  (`text-navy`, `text-primary`, `text-muted`, `<Card>`, `<LinkButton>`),
  bukan Tailwind generic `text-teal-600`. Warnanya sekarang match halaman.
- **Landing.tsx** sudah dimodifikasi lengkap dan siap tempel:
  - Import `PricingSection` ditambahkan
  - `<PricingSection />` diletakkan tepat di bawah section "Coba gratis, tanpa risiko"
    dan sebelum FAQ (posisi persis yang direkomendasikan)
  - Kalimat "Top-up berbayar akan aktif dalam beberapa minggu..." dihapus
  - Jawaban FAQ "Berapa harganya?" di-update sebutkan 3 paket + harga

## Cara pakai

### 1. Timpa 2 file ini

```
components/PricingSection.tsx           ← TIMPA (yang sudah ke-push kemarin)
components/marketing/Landing.tsx        ← TIMPA
```

Buka di VS Code → Ctrl+A → paste → Ctrl+S.

### 2. Pastikan `lib/payment/packages.ts` sudah versi baru

Yang dari zip kemarin. Kalau sudah ke-push, tidak perlu diapa-apakan.

### 3. Commit & push

```bash
git add .
git commit -m "Fix PricingSection styling & pasang di Landing"
git push
```

### 4. Cek di https://www.keposting.com

Setelah Vercel selesai deploy (~1–2 menit), refresh landing page.
Urutan section yang akan terlihat:

```
Hero → Trust bar → Masalah → Cara kerja → Fitur → Per jenis usaha
→ Coba gratis, tanpa risiko
→ Harga top-up token  🆕 (3 kartu)
→ Pertanyaan umum (FAQ dengan jawaban harga baru)
→ CTA penutup → Footer
```

### 5. Kabari Midtrans

Chat support di dashboard atau email support@midtrans.com:

> "Halo, akun Merchant [Nama Bisnis / Merchant ID] pengajuan aktivasi
> masih dalam review. Saya sudah memperbarui website https://www.keposting.com
> dengan informasi harga produk yang jelas (3 paket top-up token).
> Mohon review dapat dilanjutkan. Terima kasih."

## Bersih-bersih (opsional)

Folder `keposting-pricing/` di root proyek (dari zip pertama)
adalah duplikat yang tidak dipakai. Boleh dihapus di VS Code lalu commit lagi:

```bash
git rm -r keposting-pricing
git commit -m "Hapus folder duplikat keposting-pricing"
git push
```
