import { pengumumanTemplate } from "@/lib/templates/example-pengumuman";
import type { RenderInput } from "@/lib/templates/types";

export type GenerateFormState = {
  headline: string;
  body: string;
  photoUrl: string;
};

export function buildRenderInput(form: GenerateFormState): RenderInput {
  return {
    template: pengumumanTemplate,
    values: {
      headline: form.headline,
      body: form.body,
      photo: form.photoUrl,
    },
  };
}
