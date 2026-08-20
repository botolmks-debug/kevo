// lib/instagram/serverUser.ts
// Ambil user yang sedang login di dalam route handler.
// Self-contained (tidak bergantung helper lain) supaya paket IG mudah dipasang.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getRouteUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {
          /* route read-only: session refresh ditangani middleware/proxy */
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user; // null kalau belum login
}
