import fs from "node:fs";
import path from "node:path";
import type { CSSProperties } from "react";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import type { RenderInput, Slot } from "../templates/types";
import { fitTextForDisplay } from "./fitText";

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
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      return null;
    }
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

export async function renderTemplate(input: RenderInput): Promise<Buffer> {
  const { template, values } = input;
  const fonts = loadFontBuffers();

  const logoDataUri = await loadImageAsDataUri(template.brand.logoUrl);
  const badgeDataUri = await loadImageAsDataUri(template.brand.badgeUrl);

  const slotElements = await Promise.all(
    template.slots.map((slot) => renderSlotElement(slot, values)),
  );

  const footerStyle: SatoriStyle = {
    position: "absolute",
    left: 60,
    top: template.canvas.height - 90,
    display: "flex",
    flexDirection: "column",
  };

  const element = (
    <div
      style={{
        width: template.canvas.width,
        height: template.canvas.height,
        display: "flex",
        position: "relative",
        backgroundColor: template.brand.backgroundColor,
        fontFamily: "Inter",
      }}
    >
      {logoDataUri ? (
        // eslint-disable-next-line @next/next/no-img-element -- node JSX untuk satori, bukan DOM browser; next/image tidak berlaku di sini
        <img
          src={logoDataUri}
          alt=""
          width={64}
          height={64}
          style={{ position: "absolute", top: 40, right: 40 }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 40,
            width: 64,
            height: 64,
            borderRadius: 999,
            backgroundColor: PLACEHOLDER_COLOR,
            display: "flex",
          }}
        />
      )}

      {badgeDataUri ? (
        // eslint-disable-next-line @next/next/no-img-element -- node JSX untuk satori, bukan DOM browser; next/image tidak berlaku di sini
        <img
          src={badgeDataUri}
          alt=""
          width={140}
          height={32}
          style={{ position: "absolute", top: 120, right: 40 }}
        />
      ) : null}

      {slotElements}

      <div style={footerStyle}>
        <div style={{ display: "block", color: "#ffffff", fontSize: 22, fontWeight: 700 }}>
          {template.brand.footer.text}
        </div>
        <div style={{ display: "block", color: "#94a3b8", fontSize: 18 }}>
          {`${template.brand.footer.waNumber} · ${template.brand.footer.handles}`}
        </div>
      </div>
    </div>
  );

  const svg = await satori(element, {
    width: template.canvas.width,
    height: template.canvas.height,
    fonts: [
      { name: "Inter", data: fonts.regular, weight: 400, style: "normal" },
      { name: "Inter", data: fonts.bold, weight: 700, style: "normal" },
    ],
  });

  const resvg = new Resvg(svg, { fitTo: { mode: "original" } });
  const pngData = resvg.render();
  return pngData.asPng();
}
