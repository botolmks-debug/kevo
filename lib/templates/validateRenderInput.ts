import type {
  AspectRatio,
  Box,
  ImageSlot,
  RenderInput,
  Slot,
  Template,
  TemplateLayout,
  TextSlot,
} from "./types";

export type ValidationResult =
  | { ok: true; value: RenderInput }
  | { ok: false; error: string };

const ASPECT_RATIOS: AspectRatio[] = ["4:5", "1:1", "9:16"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isBox(value: unknown, path: string): value is Box {
  if (!isRecord(value)) {
    throw new Error(`${path} harus berupa object`);
  }
  for (const key of ["x", "y", "width", "height"] as const) {
    if (!isFiniteNumber(value[key])) {
      throw new Error(`${path}.${key} harus berupa angka`);
    }
  }
  return true;
}

function validateTextSlot(slot: Record<string, unknown>, path: string): TextSlot {
  isBox(slot.box, `${path}.box`);

  if (!isNonEmptyString(slot.fontFamily)) {
    throw new Error(`${path}.fontFamily harus berupa string tidak kosong`);
  }
  if (!isFiniteNumber(slot.maxFontSize)) {
    throw new Error(`${path}.maxFontSize harus berupa angka`);
  }
  if (!isFiniteNumber(slot.minFontSize)) {
    throw new Error(`${path}.minFontSize harus berupa angka`);
  }
  if (!isFiniteNumber(slot.maxLines)) {
    throw new Error(`${path}.maxLines harus berupa angka`);
  }
  if (slot.align !== "left" && slot.align !== "center" && slot.align !== "right") {
    throw new Error(`${path}.align harus salah satu dari "left" | "center" | "right"`);
  }
  if (!isNonEmptyString(slot.color)) {
    throw new Error(`${path}.color harus berupa string tidak kosong`);
  }
  if (slot.fontWeight !== undefined && !isFiniteNumber(slot.fontWeight)) {
    throw new Error(`${path}.fontWeight harus berupa angka`);
  }

  return slot as unknown as TextSlot;
}

function validateImageSlot(slot: Record<string, unknown>, path: string): ImageSlot {
  isBox(slot.box, `${path}.box`);

  if (slot.fit !== "cover" && slot.fit !== "contain") {
    throw new Error(`${path}.fit harus salah satu dari "cover" | "contain"`);
  }
  if (slot.borderRadius !== undefined && !isFiniteNumber(slot.borderRadius)) {
    throw new Error(`${path}.borderRadius harus berupa angka`);
  }

  return slot as unknown as ImageSlot;
}

function validateSlot(value: unknown, index: number, layoutPath: string): Slot {
  const path = `${layoutPath}.slots[${index}]`;
  if (!isRecord(value)) {
    throw new Error(`${path} harus berupa object`);
  }
  if (!isNonEmptyString(value.id)) {
    throw new Error(`${path}.id harus berupa string tidak kosong`);
  }
  if (value.type === "text") {
    return validateTextSlot(value, path);
  }
  if (value.type === "image") {
    return validateImageSlot(value, path);
  }
  throw new Error(`${path}.type harus salah satu dari "text" | "image"`);
}

function validateLayout(value: unknown, ratio: AspectRatio): TemplateLayout {
  const path = `template.layouts["${ratio}"]`;
  if (!isRecord(value)) {
    throw new Error(`${path} harus berupa object`);
  }

  if (!isRecord(value.canvas)) {
    throw new Error(`${path}.canvas harus berupa object`);
  }
  if (!isFiniteNumber(value.canvas.width) || !isFiniteNumber(value.canvas.height)) {
    throw new Error(`${path}.canvas.width dan height harus berupa angka`);
  }

  if (!isRecord(value.logo)) {
    throw new Error(`${path}.logo harus berupa object`);
  }
  for (const key of ["x", "y", "size"] as const) {
    if (!isFiniteNumber(value.logo[key])) {
      throw new Error(`${path}.logo.${key} harus berupa angka`);
    }
  }

  if (!isRecord(value.footerLayout)) {
    throw new Error(`${path}.footerLayout harus berupa object`);
  }
  const footerLayout = value.footerLayout;
  for (const key of ["x", "y", "gap", "iconSize", "textSize"] as const) {
    if (!isFiniteNumber(footerLayout[key])) {
      throw new Error(`${path}.footerLayout.${key} harus berupa angka`);
    }
  }
  if (footerLayout.direction !== "row" && footerLayout.direction !== "column") {
    throw new Error(`${path}.footerLayout.direction harus salah satu dari "row" | "column"`);
  }
  if (!isNonEmptyString(footerLayout.textColor)) {
    throw new Error(`${path}.footerLayout.textColor harus berupa string tidak kosong`);
  }
  if (!isNonEmptyString(footerLayout.nameColor)) {
    throw new Error(`${path}.footerLayout.nameColor harus berupa string tidak kosong`);
  }

  if (value.decorations !== undefined) {
    if (!Array.isArray(value.decorations)) {
      throw new Error(`${path}.decorations harus berupa array`);
    }
    value.decorations.forEach((decoration, index) => {
      const decPath = `${path}.decorations[${index}]`;
      if (!isRecord(decoration)) {
        throw new Error(`${decPath} harus berupa object`);
      }
      isBox(decoration.box, `${decPath}.box`);
      if (decoration.shape !== "rect" && decoration.shape !== "circle" && decoration.shape !== "text") {
        throw new Error(`${decPath}.shape harus salah satu dari "rect" | "circle" | "text"`);
      }
      if (!isNonEmptyString(decoration.color)) {
        throw new Error(`${decPath}.color harus berupa string tidak kosong`);
      }
    });
  }

  if (!Array.isArray(value.slots) || value.slots.length === 0) {
    throw new Error(`${path}.slots harus berupa array tidak kosong`);
  }
  const slots = value.slots.map((slot, index) => validateSlot(slot, index, path));

  const ids = new Set<string>();
  for (const slot of slots) {
    if (ids.has(slot.id)) {
      throw new Error(`${path}.slots memiliki id duplikat: "${slot.id}"`);
    }
    ids.add(slot.id);
  }

  return value as unknown as TemplateLayout;
}

function validateTemplate(value: unknown): Template {
  if (!isRecord(value)) {
    throw new Error("template harus berupa object");
  }
  if (!isNonEmptyString(value.id)) {
    throw new Error("template.id harus berupa string tidak kosong");
  }
  if (!isNonEmptyString(value.name)) {
    throw new Error("template.name harus berupa string tidak kosong");
  }

  if (!isRecord(value.brand)) {
    throw new Error("template.brand harus berupa object");
  }
  const brand = value.brand;
  if (!isNonEmptyString(brand.backgroundColor)) {
    throw new Error("template.brand.backgroundColor harus berupa string tidak kosong");
  }
  if (!isNonEmptyString(brand.logoUrl)) {
    throw new Error("template.brand.logoUrl harus berupa string tidak kosong");
  }
  if (!isRecord(brand.footer)) {
    throw new Error("template.brand.footer harus berupa object");
  }
  if (!isNonEmptyString(brand.footer.text)) {
    throw new Error("template.brand.footer.text harus berupa string tidak kosong");
  }
  if (!Array.isArray(brand.footer.socials) || brand.footer.socials.length === 0) {
    throw new Error("template.brand.footer.socials harus berupa array tidak kosong");
  }
  if (brand.footer.socials.length > 3) {
    throw new Error("template.brand.footer.socials maksimal 3 entri");
  }
  brand.footer.socials.forEach((social, index) => {
    const path = `template.brand.footer.socials[${index}]`;
    if (!isRecord(social)) {
      throw new Error(`${path} harus berupa object`);
    }
    if (!isNonEmptyString(social.platformId)) {
      throw new Error(`${path}.platformId harus berupa string tidak kosong`);
    }
    if (!isNonEmptyString(social.value)) {
      throw new Error(`${path}.value harus berupa string tidak kosong`);
    }
  });

  if (!isRecord(value.layouts)) {
    throw new Error("template.layouts harus berupa object");
  }
  for (const ratio of ASPECT_RATIOS) {
    validateLayout(value.layouts[ratio], ratio);
  }

  return value as unknown as Template;
}

export function validateRenderInput(input: unknown): ValidationResult {
  try {
    if (!isRecord(input)) {
      throw new Error("body harus berupa object");
    }

    const template = validateTemplate(input.template);

    if (!isRecord(input.values)) {
      throw new Error("values harus berupa object");
    }
    for (const [key, val] of Object.entries(input.values)) {
      if (typeof val !== "string") {
        throw new Error(`values.${key} harus berupa string`);
      }
    }

    if (input.ratio !== "4:5" && input.ratio !== "1:1" && input.ratio !== "9:16") {
      throw new Error('ratio harus salah satu dari "4:5" | "1:1" | "9:16"');
    }

    return {
      ok: true,
      value: { template, values: input.values as Record<string, string>, ratio: input.ratio },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "input tidak valid",
    };
  }
}
