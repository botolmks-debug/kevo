import type { AspectRatio, Box, DeliveryBadges, LogoLayout, Template } from "@/lib/templates/types";

export type TextSlotOverride = {
  box?: Box;
  fontFamily?: string;
  fontWeight?: number;
  fontSize?: number;
  color?: string;
  align?: "left" | "center" | "right";
  /** Shadow sekeliling teks. blur dalam px (skala template), warna hex. */
  shadow?: { blur: number; color: string; opacity: number } | null;
  outline?: { width: number; color: string } | null;
};

export type FooterOverride = {
  x: number;
  y: number;
  direction?: "row" | "column";
  iconSize?: number;
  textSize?: number;
  gap?: number;
};

export type EditorOverrides = {
  slots: Record<string, TextSlotOverride>;
  footer?: FooterOverride;
  logo?: LogoLayout;
  /** Versi logo yang dipakai di konten: "light" (default) atau "dark". */
  logoVariant?: "dark" | "light";
  /** Badge pesan-antar (ShopeeFood/GoFood/GrabFood) — di luar sosmed. */
  delivery?: DeliveryBadges;
};

export function applyEditorOverrides(
  template: Template,
  ratio: AspectRatio,
  overrides: EditorOverrides,
): Template {
  const layout = template.layouts[ratio];

  const slots = layout.slots.map((slot) => {
    if (slot.type !== "text") return slot;
    const override = overrides.slots[slot.id];
    if (!override) return slot;
    return {
      ...slot,
      box: override.box ?? slot.box,
      fontFamily: override.fontFamily ?? slot.fontFamily,
      fontWeight: override.fontWeight ?? slot.fontWeight,
      color: override.color ?? slot.color,
      align: override.align ?? slot.align,
      ...(override.shadow !== undefined ? { shadow: override.shadow } : {}),
      ...(override.outline !== undefined ? { outline: override.outline } : {}),
      ...(override.fontSize
        ? { maxFontSize: override.fontSize, minFontSize: override.fontSize }
        : {}),
    };
  });

  const footerLayout = overrides.footer
    ? {
        ...layout.footerLayout,
        x: overrides.footer.x,
        y: overrides.footer.y,
        ...(overrides.footer.direction ? { direction: overrides.footer.direction } : {}),
        ...(overrides.footer.iconSize ? { iconSize: overrides.footer.iconSize } : {}),
        ...(overrides.footer.textSize ? { textSize: overrides.footer.textSize } : {}),
        ...(overrides.footer.gap !== undefined ? { gap: overrides.footer.gap } : {}),
      }
    : layout.footerLayout;

  const logo = overrides.logo ? { ...layout.logo, ...overrides.logo } : layout.logo;

  return {
    ...template,
    layouts: {
      ...template.layouts,
      [ratio]: {
        ...layout,
        slots,
        footerLayout,
        logo,
        ...(overrides.delivery ? { deliveryBadges: overrides.delivery } : {}),
      },
    },
  };
}
