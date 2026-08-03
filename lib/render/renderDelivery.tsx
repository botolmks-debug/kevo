import fs from "fs";
import path from "path";
import type { CSSProperties } from "react";
import type { DeliveryBadges } from "@/lib/templates/types";
import { DELIVERY_MAP } from "@/lib/social/delivery";

// Chip logo (PNG rasio 130x104 = 1.25:1) di public/delivery/.
const CHIP_H = 76;
const CHIP_W = Math.round((CHIP_H * 130) / 104);

const chipCache = new Map<string, string | null>();
function chipDataUri(id: string): string | null {
  if (chipCache.has(id)) return chipCache.get(id) ?? null;
  try {
    const p = path.join(process.cwd(), "public", "delivery", `${id}.png`);
    const uri = `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;
    chipCache.set(id, uri);
    return uri;
  } catch {
    chipCache.set(id, null);
    return null;
  }
}

export function renderDeliveryBadges(badges: DeliveryBadges) {
  const ids = (badges.ids ?? []).filter((id) => DELIVERY_MAP[id]);
  if (ids.length === 0) return null;
  const label = badges.label ?? "Available on";
  const s = badges.scale ?? 1;
  const align = badges.align ?? "left";
  const chipH = Math.round(CHIP_H * s);
  const chipW = Math.round(CHIP_W * s);
  const alignItems = align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";

  const container: CSSProperties = {
    position: "absolute",
    left: badges.x,
    top: badges.y,
    display: "flex",
    flexDirection: "column",
    alignItems,
    gap: Math.round(8 * s),
  };

  return (
    <div style={container}>
      {label ? (
        <div
          style={{
            display: "block",
            color: "#ffffff",
            fontSize: Math.round(28 * s),
            fontWeight: 700,
            textShadow: "0 1px 4px rgba(0,0,0,0.5)",
          }}
        >
          {label}
        </div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: Math.round(14 * s) }}>
        {ids.map((id) => {
          const uri = chipDataUri(id);
          if (!uri) return null;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={id} src={uri} width={chipW} height={chipH} alt={id} style={{ display: "flex", objectFit: "contain" }} />
          );
        })}
      </div>
    </div>
  );
}
