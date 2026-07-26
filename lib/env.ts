export type SupabaseEnvPresence = {
  supabaseUrl: boolean;
  supabaseAnonKey: boolean;
};

export function checkSupabaseEnvPresence(
  env: Record<string, string | undefined>,
): SupabaseEnvPresence {
  return {
    supabaseUrl: Boolean(env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}
