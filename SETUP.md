# Lemon Squeezy Setup Checklist

## Step 1: Deploy legal pages (bisa langsung push)

Extract semua file. Legal pages sudah siap deploy — cek isinya, edit informasi kontak/perusahaan kalau perlu:
- `app/terms/page.tsx`
- `app/privacy/page.tsx`  
- `app/refund/page.tsx`

Yang mungkin perlu di-edit:
- Effective date (sekarang: 8 Agu 2026)
- Contact email (sekarang: info@keposting.com)
- Legal entity name (kalau nanti daftar PT/UD)

## Step 2: Run SQL migration di Supabase

Buka Supabase SQL Editor → run isi file `MIGRATION.sql`.

## Step 3: Daftar Lemon Squeezy (di web LS)

1. Sign up di lemonsqueezy.com, store name "Keposting"
2. Isi KYC (passport/KTP, proof of address)
3. Isi tax info: pilih Individual, isi W-8BEN form
4. Setup payout via Wise USD account
5. Bikin 4 products (One-time payment):
   - Starter: $2 = 5 tokens
   - Regular: $4 = 10 tokens
   - Value: $7 = 20 tokens
   - Best Value: $10 = 30 tokens
6. Setelah products dibuat, dari LS Dashboard → Products → klik produk → tab Variants → **copy Variant ID** (angka)

## Step 4: Isi Variant IDs

Edit `lib/payment/lemonsqueezy-packages.ts`, ganti `REPLACE_ME_1` s/d `REPLACE_ME_4` dengan Variant ID asli dari LS.

## Step 5: Setup Webhook

Di LS Dashboard → Settings → Webhooks → Add endpoint:
- URL: `https://keposting.com/api/topup-ls/webhook`
- Events: centang `order_created` dan `order_refunded`
- Copy **Signing secret** yang muncul

## Step 6: Env Vars

Set di Vercel (Production + Preview + Development):

```
LEMONSQUEEZY_API_KEY=<dari LS Dashboard → Settings → API>
LEMONSQUEEZY_STORE_ID=<dari LS Dashboard → Settings → Store URL, angka di akhir>
LEMONSQUEEZY_WEBHOOK_SECRET=<signing secret dari step 5>
NEXT_PUBLIC_SITE_URL=https://keposting.com
```

Juga di `.env.local` untuk development.

## Step 7: Test

Cara panggil dari kode frontend (contoh):

```typescript
const res = await fetch("/api/topup-ls", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ packageId: "starter" }),
});
const { checkoutUrl } = await res.json();
window.location.href = checkoutUrl;
```

LS punya test mode — pakai kartu test-nya dulu untuk verifikasi flow lengkap sebelum go-live.

## Step 8: Integrasi ke topup page

Modifikasi `app/topup/page.tsx` yang ada:
- Deteksi bahasa user via `getLang()` dari `@/lib/i18n`
- Kalau `lang === "en"` → pakai LS button (call `/api/topup-ls`)
- Kalau `lang === "id"` → tetap pakai Midtrans (existing flow)

Kirim isi file `app/topup/page.tsx` yang ada kalau butuh bantuan patch spesifik.
