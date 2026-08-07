import fs from "node:fs";
import path from "node:path";
import type { CSSProperties } from "react";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import type { Decoration, RenderInput, Slot } from "../templates/types";
import { FONT_OPTIONS } from "../templates/fonts";
import { fitTextForDisplay } from "./fitText";
import { renderFooterSocials } from "./renderFooter";
import { renderDeliveryBadges } from "./renderDelivery";

// satori punya properti style non-standar (lineClamp) di luar React.CSSProperties.
type SatoriStyle = CSSProperties & { lineClamp?: number };

const PLACEHOLDER_COLOR = "#334155";

export function resolveSlotValue(
  slot: Slot,
  values: Record<string, string>,
): string | undefined {
  return values[slot.id];
}

// "extra" = 9 font pilihan editor kanvas selain Inter (lihat lib/templates/fonts.ts
// dan spec-editor-kanvas-kevo.md). Template bawaan semua masih pakai "Inter" saja —
// font ini cuma dipakai kalau user pilih lewat editor.
export function loadFontBuffers(): {
  regular: Buffer;
  bold: Buffer;
  extra: { family: string; data: Buffer }[];
} {
  const fontsDir = path.join(process.cwd(), "public", "fonts");
  const extra = FONT_OPTIONS.filter((font) => font.id !== "inter").map((font) => ({
    family: font.family,
    data: fs.readFileSync(path.join(fontsDir, font.fileName)),
  }));
  return {
    regular: fs.readFileSync(path.join(fontsDir, "Inter-Regular.ttf")),
    bold: fs.readFileSync(path.join(fontsDir, "Inter-Bold.ttf")),
    extra,
  };
}

// Deteksi MIME dari magic bytes — jangan percaya Content-Type/blob.type yang bisa
// salah (mis. JPEG dilayani sebagai image/png → Satori gagal decode → hitam).
// Baca dimensi asli gambar (PNG/JPEG) dari byte — dipakai agar logo di render
// (Satori) mengisi kotak PERSIS seperti di editor (Konva): contain + center
// dihitung manual, bukan mengandalkan objectFit yang bisa beda perilaku.
function getImageDimensions(buf: Buffer): { w: number; h: number } | null {
  try {
    if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50) {
      return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }; // PNG IHDR
    }
    if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
      let off = 2;
      while (off + 9 < buf.length) {
        if (buf[off] !== 0xff) { off++; continue; }
        const marker = buf[off + 1];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { h: buf.readUInt16BE(off + 5), w: buf.readUInt16BE(off + 7) }; // JPEG SOF
        }
        off += 2 + buf.readUInt16BE(off + 2);
      }
    }
    return null;
  } catch {
    return null;
  }
}

function sniffImageMime(buf: Buffer): string {
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 3 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "image/gif";
  if (buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45) return "image/webp";
  return "image/jpeg";
}

export async function loadImageAsDataUri(
  url: string | undefined,
): Promise<string | null> {
  if (!url) {
    return null;
  }
  if (url.startsWith("data:")) {
    return url;
  }
  // 1) Coba fetch biasa (cepat; berhasil kalau bucket/URL publik).
  try {
    const res = await fetch(url);
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      return `data:${sniffImageMime(buf)};base64,${buf.toString("base64")}`;
    }
  } catch {
    // lanjut ke fallback di bawah
  }
  // 2) Fallback: kalau ini URL storage Supabase yang gagal di-fetch (bucket
  //    privat / RLS), unduh langsung pakai service-role client. Ini AKAR
  //    perbaikan bug "gambar hitam saat simpan" — server jadi selalu bisa
  //    membaca gambar tanpa bergantung bucket harus publik.
  return downloadSupabaseStorageAsDataUri(url);
}

async function downloadSupabaseStorageAsDataUri(url: string): Promise<string | null> {
  try {
    // Format URL Supabase: .../storage/v1/object/(public|sign|authenticated)/<bucket>/<path>
    const m = url.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/?]+)\/([^?]+)/);
    if (!m) return null;
    const bucket = m[1];
    const objectPath = decodeURIComponent(m[2]);
    const { createServiceRoleClient } = await import("@/lib/supabase/serviceRole");
    const client = createServiceRoleClient();
    const { data, error } = await client.storage.from(bucket).download(objectPath);
    if (error || !data) return null;
    const buf = Buffer.from(await data.arrayBuffer());
    return `data:${sniffImageMime(buf)};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function alignToJustify(align: "left" | "center" | "right"): CSSProperties["justifyContent"] {
  if (align === "left") return "flex-start";
  if (align === "right") return "flex-end";
  return "center";
}

async function renderSlotElement(slot: Slot, values: Record<string, string>) {
  const boxStyle: SatoriStyle = {
    position: "absolute",
    left: slot.box.x,
    top: slot.box.y,
    width: slot.box.width,
    height: slot.box.height,
    display: "flex",
  };

  if (slot.type === "text") {
    const rawValue = resolveSlotValue(slot, values) ?? "";
    const fitted = fitTextForDisplay(rawValue, {
      boxWidth: slot.box.width,
      fontSize: slot.maxFontSize,
      maxLines: slot.maxLines,
    });

    const textStyle: SatoriStyle = {
      display: "block",
      width: "100%",
      fontFamily: slot.fontFamily,
      // TODO v1.1: auto-shrink maxFontSize -> minFontSize sebelum clamp
      fontSize: slot.maxFontSize,
      fontWeight: slot.fontWeight ?? 400,
      color: slot.color,
      textAlign: slot.align,
      lineClamp: slot.maxLines,
      // Samakan dengan editor Konva (default lineHeight = 1) supaya tinggi blok
      // teks & posisinya identik antara preview dan hasil export.
      lineHeight: 1,
    };

    // Outline + shadow (dari editor overrides) → disimulasikan via textShadow
    // supaya ikut ter-render di PNG (Satori), konsisten dengan preview kanvas.
    const ext = slot as typeof slot & {
      shadow?: { blur: number; color: string; opacity: number } | null;
      outline?: { width: number; color: string } | null;
    };
    const shadowParts: string[] = [];
    if (ext.outline && ext.outline.width > 0) {
      const w = ext.outline.width;
      const c = ext.outline.color;
      const dirs = [[-w, 0], [w, 0], [0, -w], [0, w], [-w, -w], [w, -w], [-w, w], [w, w]];
      for (const [dx, dy] of dirs) shadowParts.push(`${dx}px ${dy}px 0 ${c}`);
    }
    if (ext.shadow) {
      const s = ext.shadow;
      const h = s.color.replace("#", "");
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      shadowParts.push(`0px 0px ${s.blur}px rgba(${r},${g},${b},${s.opacity})`);
    }
    if (shadowParts.length) {
      (textStyle as { textShadow?: string }).textShadow = shadowParts.join(", ");
    }

    return (
      <div
        key={slot.id}
        style={{ ...boxStyle, alignItems: "flex-start", justifyContent: alignToJustify(slot.align) }}
      >
        <div style={textStyle}>{fitted}</div>
      </div>
    );
  }

  const rawValue = resolveSlotValue(slot, values);
  const dataUri = await loadImageAsDataUri(rawValue);

  if (!dataUri) {
    return (
      <div
        key={slot.id}
        style={{
          ...boxStyle,
          backgroundColor: PLACEHOLDER_COLOR,
          borderRadius: slot.borderRadius ?? 0,
        }}
      />
    );
  }

  if (slot.fit === "contain") {
    // Foto utuh (tidak terpotong): layer blur cover di belakang (dari gambar
    // yang sama) mengisi celah, lalu foto tajam contain di atasnya. Padding
    // ekstra pada layer blur supaya feathering blur tidak kelihatan tepinya
    // (dipotong oleh overflow:hidden pembungkus).
    const blurPad = 24;
    return (
      <div
        key={slot.id}
        style={{
          ...boxStyle,
          overflow: "hidden",
          borderRadius: slot.borderRadius ?? 0,
          backgroundColor: PLACEHOLDER_COLOR,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- node JSX untuk satori, bukan DOM browser */}
        <img
          src={dataUri}
          alt=""
          width={slot.box.width + blurPad * 2}
          height={slot.box.height + blurPad * 2}
          style={{
            position: "absolute",
            left: -blurPad,
            top: -blurPad,
            width: slot.box.width + blurPad * 2,
            height: slot.box.height + blurPad * 2,
            objectFit: "cover",
            filter: "blur(24px)",
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- node JSX untuk satori, bukan DOM browser */}
        <img
          src={dataUri}
          alt=""
          width={slot.box.width}
          height={slot.box.height}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: slot.box.width,
            height: slot.box.height,
            objectFit: "contain",
          }}
        />
      </div>
    );
  }

  // Foto latar utama: zoom ~4% (overscan) supaya tepi kosong/margin dari AI
  // terdorong keluar bingkai — hasil PNG penuh & sama seperti preview editor.
  if (slot.id === "photo" && slot.fit === "cover") {
    const zx = slot.box.width * 0.04;
    const zy = slot.box.height * 0.04;
    return (
      <div
        key={slot.id}
        style={{ ...boxStyle, overflow: "hidden", borderRadius: slot.borderRadius ?? 0 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- node JSX untuk satori */}
        <img
          src={dataUri}
          alt=""
          width={slot.box.width + zx * 2}
          height={slot.box.height + zy * 2}
          style={{
            position: "absolute",
            left: -zx,
            top: -zy,
            width: slot.box.width + zx * 2,
            height: slot.box.height + zy * 2,
            objectFit: "cover",
          }}
        />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- node JSX untuk satori, bukan DOM browser; next/image tidak berlaku di sini
    <img
      key={slot.id}
      src={dataUri}
      alt=""
      width={slot.box.width}
      height={slot.box.height}
      style={{
        ...boxStyle,
        objectFit: slot.fit,
        borderRadius: slot.borderRadius ?? 0,
      }}
    />
  );
}

function renderDecoration(decoration: Decoration, key: number) {
  // satori: sebuah key gaya yang bernilai `undefined` (bukan absen) bikin crash,
  // jadi key opsional (transform/border*) di-spread kondisional, bukan diisi undefined.
  const baseStyle: SatoriStyle = {
    position: "absolute",
    left: decoration.box.x,
    top: decoration.box.y,
    width: decoration.box.width,
    height: decoration.box.height,
    display: "flex",
    opacity: decoration.opacity ?? 1,
    ...(decoration.rotateDeg ? { transform: `rotate(${decoration.rotateDeg}deg)` } : {}),
  };

  if (decoration.shape === "circle") {
    return (
      <div
        key={key}
        style={{ ...baseStyle, ...(decoration.color.startsWith("linear-gradient")
            ? { backgroundImage: decoration.color }
            : { backgroundColor: decoration.color }), borderRadius: 9999 }}
      />
    );
  }

  if (decoration.shape === "rect") {
    return (
      <div
        key={key}
        style={{
         ...baseStyle,
          ...(decoration.color.startsWith("linear-gradient")
            ? { backgroundImage: decoration.color }
            : { backgroundColor: decoration.color }),
          borderRadius: decoration.borderRadius ?? 0,
          ...(decoration.borderStyle
            ? {
                borderStyle: decoration.borderStyle,
                borderWidth: decoration.borderWidth ?? 2,
                borderColor: decoration.borderColor ?? decoration.color,
              }
            : {}),
        }}
      />
    );
  }

  return (
    <div key={key} style={{ ...baseStyle, alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          display: "block",
          fontFamily: "Inter",
          fontSize: decoration.fontSize ?? 200,
          fontWeight: decoration.fontWeight ?? 800,
          color: decoration.color,
        }}
      >
        {decoration.content ?? ""}
      </div>
    </div>
  );
}

export async function renderTemplate(input: RenderInput): Promise<Buffer> {
  const { template, values, ratio } = input;
  const layout = template.layouts[ratio];
  const fonts = loadFontBuffers();

  const logoDataUri = await loadImageAsDataUri(template.brand.logoUrl);
  const { logo, footerLayout } = layout;

  // Hitung ukuran & offset logo yang "contain"-ed di dalam kotak logo.size,
  // persis seperti LogoKonva di editor — supaya export == preview.
  let logoDraw: { w: number; h: number; left: number; top: number } | null = null;
  if (logoDataUri) {
    const b64 = logoDataUri.split(",")[1] ?? "";
    const dim = getImageDimensions(Buffer.from(b64, "base64"));
    if (dim && dim.w > 0 && dim.h > 0) {
      const fit = Math.min(logo.size / dim.w, logo.size / dim.h);
      const w = dim.w * fit;
      const h = dim.h * fit;
      logoDraw = { w, h, left: logo.x + (logo.size - w) / 2, top: logo.y + (logo.size - h) / 2 };
    }
  }

  // Urutan tumpuk sengaja begini (bukan cuma urutan array `slots`), supaya:
  // - scrim (decoration layer:"front") bisa di atas foto tapi di bawah teks;
  // - foto full-bleed (mis. "Tanpa Template") tidak pernah menutupi logo —
  //   logo SELALU dirender paling akhir/paling atas (spec-perbaikan-render-
  //   generate bagian A4). Untuk template lain (gambar & teks tidak
  //   tumpang-tindih), urutan ini tidak mengubah tampilan sama sekali.
  const imageSlots = layout.slots.filter((slot): slot is Extract<Slot, { type: "image" }> => slot.type === "image");
  const textSlots = layout.slots.filter((slot): slot is Extract<Slot, { type: "text" }> => slot.type === "text");
  const backDecorations = (layout.decorations ?? []).filter((d) => (d.layer ?? "back") === "back");
  const frontDecorations = (layout.decorations ?? []).filter((d) => d.layer === "front");

  const imageSlotElements = await Promise.all(imageSlots.map((slot) => renderSlotElement(slot, values)));
  const textSlotElements = await Promise.all(textSlots.map((slot) => renderSlotElement(slot, values)));

  const footerNameStyle: SatoriStyle = {
    position: "absolute",
    left: footerLayout.x,
    top: footerLayout.y - (footerLayout.direction === "row" ? 34 : 30),
    display: "block",
    color: footerLayout.nameColor,
    fontSize: Math.max(18, Math.round(footerLayout.textSize * 0.9)),
    fontWeight: 700,
  };

  const element = (
    <div
      style={{
        width: layout.canvas.width,
        height: layout.canvas.height,
        display: "flex",
        position: "relative",
        backgroundColor: template.brand.backgroundColor,
        fontFamily: "Inter",
      }}
    >
      {backDecorations.map((decoration, index) => renderDecoration(decoration, index))}

      {imageSlotElements}

      {frontDecorations.map((decoration, index) => renderDecoration(decoration, index))}

      {textSlotElements}

      {renderFooterSocials(template.brand.footer.socials, footerLayout)}

      {layout.deliveryBadges ? renderDeliveryBadges(layout.deliveryBadges) : null}

      {logoDataUri ? (
        // eslint-disable-next-line @next/next/no-img-element -- node JSX untuk satori, bukan DOM browser; next/image tidak berlaku di sini
        <img
          src={logoDataUri}
          alt=""
          width={logoDraw ? logoDraw.w : logo.size}
          height={logoDraw ? logoDraw.h : logo.size}
          style={{
            position: "absolute",
            top: logoDraw ? logoDraw.top : logo.y,
            left: logoDraw ? logoDraw.left : logo.x,
            // Kalau dimensi gambar tak terbaca (mis. format WEBP), jangan melar —
            // tetap contain seperti editor.
            ...(logoDraw ? {} : { objectFit: "contain" as const }),
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            top: logo.y,
            left: logo.x,
            width: logo.size,
            height: logo.size,
            borderRadius: 999,
            backgroundColor: PLACEHOLDER_COLOR,
            display: "flex",
          }}
        />
      )}
    </div>
  );

  // Tiap font ekstra didaftarkan di weight 400 & 700 sekaligus (menunjuk buffer
  // yang sama) supaya slot dengan fontWeight berapa pun tetap resolve, terlepas
  // dari apakah file sumbernya variable font atau statis satu bobot.
  const satoriFonts: { name: string; data: Buffer; weight: 400 | 700; style: "normal" }[] = [
    { name: "Inter", data: fonts.regular, weight: 400, style: "normal" },
    { name: "Inter", data: fonts.bold, weight: 700, style: "normal" },
  ];
  for (const font of fonts.extra) {
    satoriFonts.push({ name: font.family, data: font.data, weight: 400, style: "normal" });
    satoriFonts.push({ name: font.family, data: font.data, weight: 700, style: "normal" });
  }

  const svg = await satori(element, {
    width: layout.canvas.width,
    height: layout.canvas.height,
    fonts: satoriFonts,
  });

  const resvg = new Resvg(svg, { fitTo: { mode: "original" } });
  const pngData = resvg.render();
  return pngData.asPng();
}
