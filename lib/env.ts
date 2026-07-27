export type SupabaseEnvPresence = {
  supabaseUrl: boolean;
  supabaseAnonKey: boolean;
  supabaseServiceRoleKey: boolean;
};

export function checkSupabaseEnvPresence(
  env: Record<string, string | undefined>,
): SupabaseEnvPresence {
  return {
    supabaseUrl: Boolean(env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseServiceRoleKey: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
  };
}
