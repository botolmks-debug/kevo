import fs from "fs";
import path from "path";
import type { CSSProperties } from "react";
import type { CertBadgesLayout } from "@/lib/templates/types";
import { CERT_BADGE_MAP, CERT_BADGE_H, CERT_BADGE_GAP } from "@/lib/social/badges";

// PNG transparan di public/badges/ — tinggi seragam, lebar per rasio logo.
const badgeCache = new Map<string, string | null>();
function badgeDataUri(id: string): string | null {
  if (badgeCache.has(id)) return badgeCache.get(id) ?? null;
  try {
    const p = path.join(process.cwd(), "public", "badges", `${id}.png`);
    const uri = `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;
    badgeCache.set(id, uri);
    return uri;
  } catch {
    badgeCache.set(id, null);
    return null;
  }
}

export function renderCertBadges(badges: CertBadgesLayout) {
  const ids = (badges.ids ?? []).filter((id) => CERT_BADGE_MAP[id]);
  if (ids.length === 0) return null;
  const s = badges.scale ?? 1;
  const h = Math.round(CERT_BADGE_H * s);

  const container: CSSProperties = {
    position: "absolute",
    left: badges.x,
    top: badges.y,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: Math.round(CERT_BADGE_GAP * s),
  };

  return (
    <div style={container}>
      {ids.map((id) => {
        const uri = badgeDataUri(id);
        if (!uri) return null;
        const w = Math.round(h * CERT_BADGE_MAP[id].aspect);
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={id} src={uri} width={w} height={h} alt={id} style={{ display: "flex", objectFit: "contain" }} />
        );
      })}
    </div>
  );
}
