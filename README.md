# Anti-Repeat Prompt Tweak

Update `lib/ai/autoContentPrompt.ts` — perkuat instruksi anti-pattern klise di prompt supaya AI tidak keluarkan judul & opening caption serupa.

## Yang berubah

### `ONIMAGE_RULE_ID` & `ONIMAGE_RULE_EN` (judul di gambar)
- **Blacklist struktur klise**: "3 kesalahan...", "5 tips...", "Kenapa X harus Y", "Cara agar...", "Rahasia di balik...", angka + kata benda + verb generik
- **6 struktur segar** yang harus dipilih rotasi:
  - Pertanyaan langsung
  - Statement kontroversial
  - Fragmen cerita
  - Insight tersembunyi
  - Perbandingan curi perhatian
  - Kata tunggal/dua kata powerful

### `CAPTION_RULES_ID` (opening caption)
- **Blacklist opening klise**: "Pernah ngerasain...?", "Kesel ga sih...?", opening angka, "Rahasia...", "Trik..."
- **6 gaya opening segar** yang rotasi:
  - Fragmen momen keseharian
  - Pengakuan jujur
  - Statement kontroversial
  - Angka data spesifik
  - Sudut pandang orang ketiga
  - Langsung ke inti tanpa basa-basi

## Setup

1. Extract zip ke `D:\Kevo project\`
2. Push:
   ```powershell
   git add -A
   git commit -m "feat: strengthen anti-cliché rules in prompt"
   git push
   ```
3. Setelah deploy, minta rekan tes lagi generate 3-5 konten. Perhatikan:
   - Judul (onImageText) harus beragam struktur — bukan semua "3 kesalahan..." atau "5 cara..."
   - Opening caption harus beragam — bukan semua "Pernah ngerasain..." atau angka

## Catatan

Ini tweak **tanpa database**. Kalau setelah tweak ini masih repeat, baru pertimbangkan database tracking angle usage per user (2-3 jam build). Prinsip: fix cheapest & smallest first.
