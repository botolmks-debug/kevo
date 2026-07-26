# Spec Irisan 01 — Mesin Render Template (Satori)

Serahkan file ini ke Claude Code sebagai task pertama. Patuhi `CLAUDE.md`.

---

## Tujuan

Bangun **mesin render** yang menerima definisi template + nilai slot
(teks & gambar), lalu menghasilkan **gambar konten (PNG)** secara
**deterministik** — frame brand selalu sama, hanya isi slot yang berubah.

Ini irisan paling berharga dan paling aman: tidak ada AI image, tidak ada
DB/auth dulu. Fokus render yang rapi & konsisten.

---

## Scope

**Termasuk (kerjakan di irisan ini):**
- Model data template + slot (TypeScript type).
- Satu template contoh bergaya "Pengumuman" (mirip acuan RS: header brand
  dengan logo + badge akreditasi, slot headline, slot teks isi, slot gambar,
  footer strip berisi WA + handle).
- Fungsi render: `template + values → image buffer (PNG)` pakai Satori/`@vercel/og`.
- Logika **fit teks** di dalam kotak slot (jangan meluber).
- Satu API route yang menerima input dan mengembalikan gambar.
- Test.

**TIDAK termasuk (irisan berikutnya, jangan dikerjakan sekarang):**
- Simpan/ambil template dari database
- Auth & multi-tenant
- Generate caption via LLM
- UI editor
- Upload/database gambar per klien (untuk sekarang, gambar cukup lewat URL)

---

## Model Data

```ts
type Canvas = { width: number; height: number }; // mis. 1080 x 1350

type TextSlot = {
  id: string;
  type: "text";
  box: { x: number; y: number; width: number; height: number };
  fontFamily: string;
  maxFontSize: number;   // ukuran ideal
  minFontSize: number;   // batas mengecil saat auto-fit
  maxLines: number;
  align: "left" | "center" | "right";
  color: string;
  fontWeight?: number;
};

type ImageSlot = {
  id: string;
  type: "image";
  box: { x: number; y: number; width: number; height: number };
  fit: "cover" | "contain";
  borderRadius?: number;
};

type Slot = TextSlot | ImageSlot;

type Template = {
  id: string;
  name: string;
  canvas: Canvas;
  // Layer brand yang TERKUNCI — selalu dirender, tidak bisa diisi user:
  brand: {
    backgroundColor: string;
    logoUrl: string;
    badgeUrl?: string;        // mis. badge akreditasi
    footer: { text: string; waNumber: string; handles: string };
  };
  slots: Slot[];
};

// Input render:
type RenderInput = {
  template: Template;
  values: Record<string, string>; // slotId -> teks (untuk text) / imageUrl (untuk image)
};
```

---

## Pendekatan Render

1. Bangun pohon JSX dari `template` + `values`.
2. Render elemen brand dulu (background, logo, badge, footer) dari `template.brand`
   — posisinya tetap, tidak bergantung input.
3. Untuk tiap slot, render di `box`-nya:
   - **text**: terapkan align/warna/weight; jalankan fit teks (lihat bawah).
   - **image**: muat dari URL; terapkan `fit` (cover/contain) + `borderRadius`.
4. Satori butuh **font buffer** yang disuplai manual — sediakan minimal 1 font
   (mis. Inter/Poppins) reguler + bold di `/fonts`, muat sebagai buffer.
5. Satori menghasilkan SVG → konversi ke **PNG** (via `@vercel/og` `ImageResponse`,
   atau `satori` + `@resvg/resvg-js`). Pilih salah satu, konsisten.

### Fit teks (bagian yang paling menipu — hati-hati)

Satori tidak punya API ukur teks yang mudah. Untuk **v1**, buat sederhana dan
andal dulu:
- Pakai `maxFontSize` sebagai default.
- Batasi baris dengan `maxLines`; teks yang melewati batas dipotong dengan
  elipsis (`…`), jangan sampai meluber keluar kotak.
- (Opsional, v1.1) auto-shrink: turunkan fontSize bertahap dari `maxFontSize`
  ke `minFontSize` sampai teks muat. Boleh ditunda; yang WAJIB v1 adalah
  **tidak meluber** — clamp + elipsis sudah cukup.

Tandai jelas di kode bagian mana yang v1 (clamp) vs rencana v1.1 (auto-shrink).

---

## API Route

`POST /api/render`
- Body: `RenderInput` (untuk sekarang template ikut dikirim di body; nanti diganti
  ambil dari DB by id).
- Response: `image/png`.
- Error: input tidak valid → 400 dengan pesan jelas; gambar hilang/tak bisa
  dimuat → jangan crash, render **placeholder** di slot gambar.

---

## Kriteria Terima (Acceptance)

- POST dengan template contoh + teks + URL gambar → mengembalikan PNG berukuran
  sesuai `canvas`.
- Elemen brand (logo, badge, footer) selalu ada di posisi identik, apa pun input.
- Headline sangat panjang **tidak meluber** dari kanvas (ter-clamp + elipsis).
- URL gambar tidak valid/hilang → keluar placeholder, bukan error 500.
- Render untuk input yang sama menghasilkan output yang sama (deterministik).

---

## Test yang Harus Ada

- **Unit — resolusi slot:** `values` terpetakan ke slot yang benar; slot tanpa
  nilai ditangani (default/placeholder), bukan crash.
- **Unit — fit teks:** untuk teks melebihi `maxLines`, hasilkan teks
  ter-clamp + elipsis sesuai harapan; teks pendek tidak berubah.
- **Unit — validasi input:** input tak valid ditolak dengan pesan jelas.
- **Smoke render:** untuk input tetap, render menghasilkan buffer PNG non-kosong
  berukuran benar. (Snapshot opsional.)
- **Edge:** slot tanpa nilai; teks kepanjangan; URL gambar rusak.

---

## Deliverable (perkiraan struktur file)

```
lib/templates/types.ts                 # model data di atas
lib/templates/example-pengumuman.ts    # 1 template contoh
lib/render/renderTemplate.tsx          # fungsi render Satori → PNG
lib/render/fitText.ts                  # logika clamp/elipsis (+ hook v1.1)
app/api/render/route.ts                # endpoint
public/fonts/...                       # font untuk Satori
__tests__/...                          # test di atas
```

## Smoke Test Manual (untuk pemilik)

1. `npm run dev`
2. POST ke `/api/render` dengan template contoh + teks + 1 URL gambar
   (pakai file `.http`/curl yang disertakan agen, atau halaman uji sederhana).
3. Buka PNG hasilnya — cek frame brand rapi, teks masuk kotak, gambar pas.
