import type { CSSProperties } from "react";
import type { FooterSocial, SocialFooterLayout } from "@/lib/templates/types";
import { MAX_SELECTED_SOCIALS } from "@/lib/social/platforms";
import { SocialIcon } from "@/lib/social/icons";

export function renderFooterSocials(socials: FooterSocial[], layout: SocialFooterLayout) {
  const visible = socials.slice(0, MAX_SELECTED_SOCIALS);

  const containerStyle: CSSProperties = {
    position: "absolute",
    left: layout.x,
    top: layout.y,
    display: "flex",
    flexDirection: layout.direction === "column" ? "column" : "row",
    alignItems: layout.direction === "column" ? (layout.align ?? "flex-start") : "center",
    gap: layout.gap,
  };

  return (
    <div style={containerStyle}>
      {visible.map((social) => (
        <div
          key={social.platformId}
          style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10 }}
        >
          <SocialIcon platformId={social.platformId} size={layout.iconSize} />
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
      ))}
    </div>
  );
}
