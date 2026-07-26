import type { GenerateFormState } from "./buildRenderInput";

export type FormValidationResult = { ok: true } | { ok: false; error: string };

export function validateGenerateForm(form: GenerateFormState): FormValidationResult {
  if (form.headline.trim().length === 0) {
    return { ok: false, error: "Headline tidak boleh kosong." };
  }
  if (form.body.trim().length === 0) {
    return { ok: false, error: "Isi tidak boleh kosong." };
  }
  return { ok: true };
}
