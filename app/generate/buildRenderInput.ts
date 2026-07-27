import type { AspectRatio, RenderInput, Template } from "@/lib/templates/types";

export function buildRenderInput(
  template: Template,
  values: Record<string, string>,
  ratio: AspectRatio,
): RenderInput {
  return { template, values, ratio };
}
