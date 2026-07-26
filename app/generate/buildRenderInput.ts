import type { RenderInput, Template } from "@/lib/templates/types";

export function buildRenderInput(
  template: Template,
  values: Record<string, string>,
): RenderInput {
  return { template, values };
}
