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
};

export type ImageSlot = {
  id: string;
  type: "image";
  box: Box;
  fit: "cover" | "contain";
  borderRadius?: number;
};

export type Slot = TextSlot | ImageSlot;

export type Template = {
  id: string;
  name: string;
  canvas: Canvas;
  brand: {
    backgroundColor: string;
    logoUrl: string;
    badgeUrl?: string;
    footer: { text: string; waNumber: string; handles: string };
  };
  slots: Slot[];
};

export type RenderInput = {
  template: Template;
  values: Record<string, string>;
};
