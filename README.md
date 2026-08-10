# T&C Fitur Referensi (Generate Otomatis)

Menambahkan modal Terms & Conditions yang muncul saat user pertama kali klik "Generate Otomatis" dengan jenis konten **Referensi**.

## Perilaku

1. User pilih jenis "Referensi", upload produk + gambar referensi
2. User klik **Generate Otomatis**
3. Kalau belum pernah setuju T&C → modal muncul:
   - 5 poin ketentuan tentang hak pakai referensi & tanggung jawab
   - Checkbox "Saya mengerti dan setuju" (wajib centang untuk lanjut)
   - Tombol Batal / Lanjut Generate
4. Setelah user centang & klik **Lanjut Generate**:
   - Preferensi tersimpan di `localStorage` (`keposting_reference_tc_v1`)
   - Generate langsung jalan
5. Generate berikutnya (dengan jenis Referensi) → **modal tidak muncul lagi**

## Bilingual

Modal otomatis mengikuti bahasa app (Indonesia/English) via `getLang()`.

## Files

**Baru:**
- `components/generate-otomatis/ReferenceTermsModal.tsx` — komponen modal + helper `hasAcceptedReferenceTerms()` & `markReferenceTermsAccepted()`

**Direplace:**
- `app/generate-otomatis/AutoGenerate.tsx` — 3 injection points minimal:
  - Import di atas
  - State `showReferenceModal` + `pendingRatioRef`
  - Cek T&C di `handleGenerate` (kalau jenis="referensi" & belum accept → tampilkan modal)
  - Render `<ReferenceTermsModal />` sebelum closing `</Card>`

## Setup

1. Extract zip ke `D:\Kevo project\`
2. Push:
   ```powershell
   git add -A
   git commit -m "feat: T&C modal for reference feature (auto generate)"
   git push
   ```
3. Tunggu Vercel deploy (~1-2 menit)
4. Tes: buka `keposting.com/generate-otomatis` → pilih **Referensi** → upload produk + referensi → klik Generate → modal harus muncul

## Cara reset T&C (untuk testing)

Kalau mau tes ulang modal setelah accept:
- Buka DevTools Console
- Jalankan: `localStorage.removeItem("keposting_reference_tc_v1")`
- Refresh halaman

## Kalau nanti perlu update ketentuan

Edit array `T.points` di `components/generate-otomatis/ReferenceTermsModal.tsx`. Kalau ada perubahan yang signifikan, ganti nama `STORAGE_KEY` (misal `keposting_reference_tc_v2`) supaya user lama harus setuju versi baru.
