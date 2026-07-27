import fs from "node:fs";
import path from "node:path";
import type { CSSProperties } from "react";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import type { Decoration, RenderInput, Slot } from "../templates/types";
import { fitTextForDisplay } from "./fitText";
import { renderFooterSocials } from "./renderFooter";

// satori punya properti style non-standar (lineClamp) di luar React.CSSProperties.
type SatoriStyle = CSSProperties & { lineClamp?: number };

const PLACEHOLDER_COLOR = "#334155";

export function resolveSlotValue(
  slot: Slot,
  values: Record<string, string>,
): string | undefined {
  return values[slot.id];
}

export function loadFontBuffers(): { regular: Buffer; bold: Buffer } {
  const fontsDir = path.join(process.cwd(), "public", "fonts");
  return {
    regular: fs.readFileSync(path.join(fontsDir, "Inter-Regular.ttf")),
    bold: fs.readFileSync(path.join(fontsDir, "Inter-Bold.ttf")),
  };
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
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return null;
    }
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
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
    };

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
        style={{ ...baseStyle, backgroundColor: decoration.color, borderRadius: 9999 }}
      />
    );
  }

  if (decoration.shape === "rect") {
    return (
      <div
        key={key}
        style={{
          ...baseStyle,
          backgroundColor: decoration.color,
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

      <div style={footerNameStyle}>{template.brand.footer.text}</div>
      {renderFooterSocials(template.brand.footer.socials, footerLayout)}

      {logoDataUri ? (
        // eslint-disable-next-line @next/next/no-img-element -- node JSX untuk satori, bukan DOM browser; next/image tidak berlaku di sini
        <img
          src={logoDataUri}
          alt=""
          width={logo.size}
          height={logo.size}
          style={{ position: "absolute", top: logo.y, left: logo.x }}
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

  const svg = await satori(element, {
    width: layout.canvas.width,
    height: layout.canvas.height,
    fonts: [
      { name: "Inter", data: fonts.regular, weight: 400, style: "normal" },
      { name: "Inter", data: fonts.bold, weight: 700, style: "normal" },
    ],
  });

  const resvg = new Resvg(svg, { fitTo: { mode: "original" } });
  const pngData = resvg.render();
  return pngData.asPng();
}
