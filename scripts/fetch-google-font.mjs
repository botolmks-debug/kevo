#!/usr/bin/env node
/**
 * Ambil file font (ttf ATAU woff, tergantung apa yang dikasih Google) dari
 * Google Fonts API, taruh ke public/fonts/ — pengganti proses download
 * manual satu-satu.
 *
 * PENTING — ini BUKAN "ambil font live tiap kali generate gambar": font
 * TETAP disimpan lokal di public/fonts/, cuma cara DAPETINnya yang
 * diotomatisasi (jalan sekali per font baru, bukan per-request). Satori
 * (renderer PNG di lib/render/renderTemplate.tsx) baca file ini langsung
 * dari disk lewat fs.readFileSync tiap render.
 *
 * Kenapa woff, bukan ttf: Google Fonts milih format dikirim berdasarkan
 * User-Agent. Dulu User-Agent Chrome lama bisa dipaksa dapat ttf, tapi
 * sekarang (per 18 Sep 2026) Google sudah kasih woff untuk User-Agent itu.
 * Satori TETAP BISA baca woff (bukan cuma ttf/otf), jadi tidak masalah —
 * malah woff ukurannya lebih kecil dari ttf (bagus buat halaman yang juga
 * pakai file ini via @font-face di browser).
 *
 * Cara pakai (nama file output BOLEH tetap .ttf atau .woff, ekstensi
 * sebenarnya otomatis disesuaikan sama isi yang didapat — kamu akan lihat
 * di output nama file FINAL yang beneran tersimpan):
 *   node scripts/fetch-google-font.mjs "Plus Jakarta Sans" 700 PlusJakartaSans-Bold
 *   node scripts/fetch-google-font.mjs "Anton" 400 Anton-Regular
 */

const OLD_BROWSER_UA =
  "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.0.0 Safari/537.36";

const [, , familyArg, weightArg, outNameArg] = process.argv;

if (!familyArg || !weightArg || !outNameArg) {
  console.error(
    'Cara pakai: node scripts/fetch-google-font.mjs "Nama Font" <weight> <nama-file-output-tanpa-ekstensi>',
  );
  console.error('Contoh: node scripts/fetch-google-font.mjs "Rubik" 700 Rubik-Bold');
  process.exitCode = 1;
} else {
  main().catch((err) => {
    console.error("Gagal:", err.message);
    process.exitCode = 1;
  });
}

async function main() {
  const family = familyArg.replace(/\s+/g, "+");
  const cssUrl = `https://fonts.googleapis.com/css2?family=${family}:wght@${weightArg}&display=swap`;

  console.log(`Ambil CSS dari Google Fonts: ${cssUrl}`);
  const cssRes = await fetch(cssUrl, { headers: { "User-Agent": OLD_BROWSER_UA } });
  if (!cssRes.ok) {
    throw new Error(`Gagal ambil CSS Google Fonts: ${cssRes.status} ${await cssRes.text()}`);
  }
  const css = await cssRes.text();

  // Terima ttf ATAU woff — apa pun yang dikasih Google, format('...') di CSS
  // yang menentukan jenisnya, bukan ekstensi URL semata.
  const match =
    /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.(ttf|woff))\)\s*format\(['"](\w+)['"]\)/.exec(css);
  if (!match) {
    console.error("CSS yang didapat:\n" + css);
    throw new Error(
      "Tidak ketemu URL font (ttf/woff) di response — kemungkinan nama font/weight salah, " +
        "atau Google berubah lagi formatnya. Cek family/weight-nya benar sesuai fonts.google.com.",
    );
  }

  const [, fontUrl, urlExt] = match;
  const ext = urlExt === "ttf" ? "ttf" : "woff";

  console.log(`Download font file (${ext}): ${fontUrl}`);
  const fontRes = await fetch(fontUrl);
  if (!fontRes.ok) {
    throw new Error(`Gagal download font file: ${fontRes.status}`);
  }
  const buffer = Buffer.from(await fontRes.arrayBuffer());

  // Buang ekstensi yang mungkin sudah ditulis user di argumen, pakai ekstensi
  // ASLI dari yang beneran didapat — supaya tidak ada file bernama .ttf tapi
  // isinya woff (menyesatkan, walau Satori tetap baca isinya dengan benar).
  const baseName = outNameArg.replace(/\.(ttf|woff|woff2)$/i, "");
  const finalName = `${baseName}.${ext}`;

  const fs = await import("node:fs/promises");
  const outPath = new URL(`../public/fonts/${finalName}`, import.meta.url);
  await fs.writeFile(outPath, buffer);
  console.log(`Tersimpan: public/fonts/${finalName} (${(buffer.length / 1024).toFixed(1)} KB)`);
  console.log(
    `PENTING: pakai nama file "${finalName}" ini (bukan nama yang kamu ketik di perintah) saat ` +
      `isi fileName di lib/templates/fonts.ts, dan format("${ext === "ttf" ? "truetype" : "woff"}") ` +
      `di app/globals.css.`,
  );
}
