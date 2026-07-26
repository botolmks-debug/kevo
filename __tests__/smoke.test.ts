import { describe, expect, it } from "vitest";
import { checkSupabaseEnvPresence } from "@/lib/env";

describe("checkSupabaseEnvPresence", () => {
  it("marks flags true only when the env var is actually set", () => {
    const result = checkSupabaseEnvPresence({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    });

    expect(result).toEqual({ supabaseUrl: true, supabaseAnonKey: false });
  });

  it("marks both flags false when nothing is set", () => {
    const result = checkSupabaseEnvPresence({
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
    });

    expect(result).toEqual({ supabaseUrl: false, supabaseAnonKey: false });
  });
});
