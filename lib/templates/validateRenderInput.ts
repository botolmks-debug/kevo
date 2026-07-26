import type {
  Box,
  ImageSlot,
  RenderInput,
  Slot,
  Template,
  TextSlot,
} from "./types";

export type ValidationResult =
  | { ok: true; value: RenderInput }
  | { ok: false; error: string };

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

function validateSlot(value: unknown, index: number): Slot {
  const path = `template.slots[${index}]`;
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

  if (!isRecord(value.canvas)) {
    throw new Error("template.canvas harus berupa object");
  }
  if (!isFiniteNumber(value.canvas.width) || !isFiniteNumber(value.canvas.height)) {
    throw new Error("template.canvas.width dan height harus berupa angka");
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
  if (brand.badgeUrl !== undefined && !isNonEmptyString(brand.badgeUrl)) {
    throw new Error("template.brand.badgeUrl harus berupa string tidak kosong");
  }
  if (!isRecord(brand.footer)) {
    throw new Error("template.brand.footer harus berupa object");
  }
  for (const key of ["text", "waNumber", "handles"] as const) {
    if (!isNonEmptyString(brand.footer[key])) {
      throw new Error(`template.brand.footer.${key} harus berupa string tidak kosong`);
    }
  }

  if (!Array.isArray(value.slots) || value.slots.length === 0) {
    throw new Error("template.slots harus berupa array tidak kosong");
  }
  const slots = value.slots.map((slot, index) => validateSlot(slot, index));

  const ids = new Set<string>();
  for (const slot of slots) {
    if (ids.has(slot.id)) {
      throw new Error(`template.slots memiliki id duplikat: "${slot.id}"`);
    }
    ids.add(slot.id);
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

    return {
      ok: true,
      value: { template, values: input.values as Record<string, string> },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "input tidak valid",
    };
  }
}
