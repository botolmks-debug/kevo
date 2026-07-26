import type { Template } from "@/lib/templates/types";

export type FormValidationResult = { ok: true } | { ok: false; error: string };

export function validateGenerateForm(
  template: Template,
  values: Record<string, string>,
): FormValidationResult {
  for (const slot of template.slots) {
    if (slot.type === "text" && (values[slot.id] ?? "").trim().length === 0) {
      return { ok: false, error: `${slot.label ?? slot.id} tidak boleh kosong.` };
    }
  }
  return { ok: true };
}
