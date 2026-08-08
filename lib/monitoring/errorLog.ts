import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

type LogErrorParams = {
  businessId?: string | null;
  route: string;
  provider?: string;
  error: unknown;
  metadata?: Record<string, any>;
};

export async function logError({
  businessId,
  route,
  provider,
  error,
  metadata,
}: LogErrorParams): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    const { error: insertError } = await supabase.from("error_logs").insert({
      business_id: businessId ?? null,
      route,
      provider: provider ?? null,
      error_message: message.slice(0, 2000),
      error_stack: stack?.slice(0, 4000) ?? null,
      metadata: metadata ?? null,
    });

    if (insertError) {
      console.error("[logError] Failed to insert:", insertError.message, insertError);
    }
  } catch (err) {
    console.error("[logError] Exception:", err);
  }
}