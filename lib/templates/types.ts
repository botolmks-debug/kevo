export type Canvas = { width: number; height: number };

export type Box = { x: number; y: number; width: number; height: number };

export type TextSlot = {
  id: string;
  type: "text";
  box: Box;
  fontFamily: string;
  maxFontSize: number;
  minFontSize: number;
  maxLines: number;
  align: "left" | "center" | "right";
  color: string;
  fontWeight?: number;
  /** Label manusiawi untuk form (fallback ke `id` kalau tidak diisi). */
  label?: string;
  /** Contoh isi (dipakai sebagai placeholder di form, bukan value awal). */
  placeholder?: string;
};

export type ImageSlot = {
  id: string;
  type: "image";
  box: Box;
  fit: "cover" | "contain";
  borderRadius?: number;
  /** Label manusiawi untuk form (fallback ke `id` kalau tidak diisi). */
  label?: string;
  /** Contoh isi (dipakai sebagai placeholder di form, bukan value awal). */
  placeholder?: string;
};

export type Slot = TextSlot | ImageSlot;

export type FooterSocial = { platformId: string; value: string };

export type LogoLayout = { x: number; y: number; size: number };

export type SocialFooterLayout = {
  x: number;
  y: number;
  direction: "row" | "column";
  gap: number;
  iconSize: number;
  textSize: number;
  /** Perataan antar-entri kalau `direction` "column" (default "flex-start"). */
  align?: "flex-start" | "center" | "flex-end";
  textColor: string;
  nameColor: string;
};

/**
 * Satu primitif dekorasi generik dipakai untuk semua motif per template
 * (band warna, bentuk diagonal/burst, confetti, tanda kutip raksasa, border
 * tiket) — supaya tidak perlu mesin render baru per motif (lihat spec-07).
 */
export type Decoration = {
  box: Box;
  shape: "rect" | "circle" | "text";
  color: string;
  opacity?: number;
  rotateDeg?: number;
  borderRadius?: number;
  borderStyle?: "solid" | "dashed";
  borderWidth?: number;
  borderColor?: string;
  /** Dipakai kalau `shape` "text" (mis. tanda kutip besar). */
  content?: string;
  fontSize?: number;
  fontWeight?: number;
  /**
   * "back" (default) = di belakang slot, seperti band/pattern biasa.
   * "front" = di atas slot — dipakai untuk scrim di atas foto full-bleed
   * (mis. "Tanpa Template"), supaya tidak ketutup foto yang memenuhi kanvas.
   */
  layer?: "back" | "front";
};

/** Rasio kanvas yang bisa dipilih user (lebar selalu 1080, tinggi berubah). */
export type AspectRatio = "4:5" | "1:1" | "9:16";

/**
 * Tata letak untuk satu rasio tertentu — geometrinya (kanvas, posisi slot,
 * logo, footer, dekorasi) sengaja beda per rasio; `slots[].id` HARUS sama
 * persis lintas ketiga rasio (cuma beda box/font) supaya nilai form tidak
 * hilang saat user ganti rasio.
 */
export type TemplateLayout = {
  canvas: Canvas;
  logo: LogoLayout;
  footerLayout: SocialFooterLayout;
  /** Motif visual layout ini; kosong/absen = polos (lihat spec-07). */
  decorations?: Decoration[];
  slots: Slot[];
};

export type Template = {
  id: string;
  name: string;
  brand: {
    backgroundColor: string;
    logoUrl: string;
    /** `socials` maksimal 3 entri — sesuai batas tampil footer (spec-05). */
    footer: { text: string; socials: FooterSocial[] };
  };
  layouts: Record<AspectRatio, TemplateLayout>;
};

export type RenderInput = {
  template: Template;
  values: Record<string, string>;
  ratio: AspectRatio;
};
