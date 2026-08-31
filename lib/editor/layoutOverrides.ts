import type { AspectRatio, Box, CertBadgesLayout, DeliveryBadges, LogoLayout, Template } from "@/lib/templates/types";

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
  /** Tampilkan nama bisnis di atas ikon sosmed (default true — perilaku lama). */
  showName?: boolean;
};

/**
 * Efek per-elemen editor DOM (v4): opacity, rotasi, urutan layer.
 * Key = "slot-<id>" | "logo" | "footer" | "delivery" | "badges" | "item-<id>".
 * HANYA dipakai editor DOM + export html-to-image; mesin Satori (fallback)
 * mengabaikannya — sengaja opsional supaya konten lama & fallback tetap jalan.
 */
export type ElementFx = { opacity?: number; rotation?: number; z?: number };

/** Elemen bebas yang ditambah user (teks/gambar stiker/bentuk) — editor DOM v4. */
export type FreeItem = {
  id: string;
  kind: "text" | "image" | "shape";
  x: number;
  y: number;
  w: number;
  h: number;
  /** kind "text" */
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  align?: "left" | "center" | "right";
  /** kind "text" — sama bentuk & perilaku dengan TextSlot.shadow/outline. */
  shadow?: { blur: number; color: string; opacity: number } | null;
  outline?: { width: number; color: string } | null;
  /** kind "image" — data URI (di-embed, aman untuk export). */
  src?: string;
  /** kind "shape" — bentuk dasar, panah, & efek promo dengan fill & stroke. */
  shapeType?: "rect" | "circle" | "triangle" | "arrow-right" | "arrow-block" | "arrow-curve" | "star" | "burst" | "ribbon" | "speech";
  fill?: string;
  stroke?: string;
  /** 0 = tanpa garis tepi. Dalam satuan kanvas (di-skala saat ditampilkan). */
  strokeWidth?: number;
  /** hanya dipakai untuk shapeType "rect". */
  cornerRadius?: number;
};

/** Lapisan warna/gradient di atas foto latar — editor DOM v4. */
export type OverlayFx = {
  type: "none" | "solid" | "bottom" | "top";
  color: string;   // hex
  opacity: number; // 0..1
};

export type EditorOverrides = {
  slots: Record<string, TextSlotOverride>;
  footer?: FooterOverride;
  logo?: LogoLayout;
  /** Versi logo yang dipakai di konten: "light" (default) atau "dark". */
  logoVariant?: "dark" | "light";
  /** Badge pesan-antar (ShopeeFood/GoFood/GrabFood) — di luar sosmed. */
  delivery?: DeliveryBadges;
  /** Badge sertifikasi (Halal/SNI/BPOM). */
  badges?: CertBadgesLayout;
  /** v4: efek per elemen (opacity/rotasi/layer) — hanya editor DOM. */
  fx?: Record<string, ElementFx>;
  /** v4: elemen bebas tambahan (teks/gambar) — hanya editor DOM. */
  items?: FreeItem[];
  /** v4: overlay warna/gradient di atas foto — hanya editor DOM. */
  overlay?: OverlayFx;
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
        ...(overrides.badges ? { certBadges: overrides.badges } : {}),
      },
    },
  };
}
