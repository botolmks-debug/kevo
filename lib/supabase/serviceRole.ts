import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase pakai SUPABASE_SERVICE_ROLE_KEY — bypass RLS sepenuhnya.
 *
 * PERINGATAN: hanya boleh dipakai dari kode server (route handler / server
 * action), TIDAK PERNAH dari komponen "use client" atau apa pun yang bisa
 * ikut ke bundle browser. Jangan re-export atau import file ini dari luar
 * folder `app/api/**`.
 */
export function createServiceRoleClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
