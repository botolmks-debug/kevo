import { describe, expect, it } from "vitest";
import { checkSupabaseEnvPresence } from "@/lib/env";

describe("checkSupabaseEnvPresence", () => {
  it("marks flags true only when the env var is actually set", () => {
    const result = checkSupabaseEnvPresence({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "secret",
    });

    expect(result).toEqual({ supabaseUrl: true, supabaseAnonKey: false, supabaseServiceRoleKey: true });
  });

  it("marks all flags false when nothing is set", () => {
    const result = checkSupabaseEnvPresence({
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    });

    expect(result).toEqual({ supabaseUrl: false, supabaseAnonKey: false, supabaseServiceRoleKey: false });
  });
});
