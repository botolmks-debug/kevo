import fs from "fs";
import path from "path";
import type { CSSProperties } from "react";
import type { FooterSocial, SocialFooterLayout } from "@/lib/templates/types";
import { MAX_SELECTED_SOCIALS } from "@/lib/social/platforms";
import { SocialIcon } from "@/lib/social/icons";

// Cache: platformId → data URI (PNG dari public/icons/) atau null (fallback SVG).
const iconCache = new Map<string, string | null>();

function iconDataUri(platformId: string): string | null {
  if (iconCache.has(platformId)) return iconCache.get(platformId) ?? null;
  try {
    const filePath = path.join(process.cwd(), "public", "icons", `${platformId}.png`);
    const buf = fs.readFileSync(filePath);
    const uri = `data:image/png;base64,${buf.toString("base64")}`;
    iconCache.set(platformId, uri);
    return uri;
  } catch {
    iconCache.set(platformId, null);
    return null;
  }
}

export function renderFooterSocials(socials: FooterSocial[], layout: SocialFooterLayout) {
  const visible = socials.slice(0, MAX_SELECTED_SOCIALS);
  const isColumn = layout.direction === "column";

  const containerStyle: CSSProperties = {
    position: "absolute",
    left: layout.x,
    top: layout.y,
    display: "flex",
    flexDirection: isColumn ? "column" : "row",
    alignItems: isColumn ? (layout.align ?? "flex-start") : "center",
    gap: layout.gap,
  };

  return (
    <div style={containerStyle}>
      {visible.map((social) => {
        const uri = iconDataUri(social.platformId);
        return (
          <div
            key={social.platformId}
            style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10 }}
          >
            {uri ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={uri}
                width={layout.iconSize}
                height={layout.iconSize}
                alt={social.platformId}
                style={{ display: "flex", objectFit: "contain", borderRadius: Math.round(layout.iconSize * 0.28) }}
              />
            ) : (
              <SocialIcon platformId={social.platformId} size={layout.iconSize} />
            )}
            <div
              style={{
                display: "block",
                fontFamily: "Inter",
                fontSize: layout.textSize,
                color: layout.textColor,
                fontWeight: 600,
              }}
            >
              {social.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
