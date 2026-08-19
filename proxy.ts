import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/supabase/tokens";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/auth",
  "/lupa-password",
  "/reset-password",
  "/coba",       // halaman demo publik (lead capture iklan/SEO) — tanpa login
  "/ide-konten", // halaman SEO publik (index + semua /ide-konten/[slug]) — tanpa login & harus bisa dirayapi Googlebot
  "/privacy",    // kebijakan privasi — WAJIB publik (verifikasi Google OAuth + dibaca calon user)
  "/terms",      // ketentuan layanan — WAJIB publik (verifikasi Google OAuth + dibaca calon user)
  "/refund",     // kebijakan refund — publik (dibaca calon pembeli sebelum bayar)
  "/maintenance",// halaman maintenance — selalu publik
];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // WAJIB: menyegarkan sesi user. Jangan sisipkan kode lain sebelum baris ini.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    path === "/" ||
    path === "/sitemap.xml" ||
    path === "/robots.txt" ||
    PUBLIC_PATHS.some((p) => path.startsWith(p));
  const isApi = path.startsWith("/api");

  // Cek maintenance mode (best-effort, tidak blokir kalau DB tidak tersedia)
  if (!isAdmin(user?.email) && !path.startsWith("/maintenance") && !path.startsWith("/api/admin/maintenance")) {
    try {
      const svc = createServiceRoleClient();
      const { data: setting } = await svc
        .from("app_settings")
        .select("value")
        .eq("key", "maintenance_mode")
        .single();
      if (setting?.value === "true") {
        // Halaman publik & landing → boleh, tapi halaman app → maintenance
        if (!isPublic && !isApi) {
          // Kalau sudah login → logout dulu (hapus session cookie), lalu redirect
          if (user) {
            const url = request.nextUrl.clone();
            url.pathname = "/maintenance";
            const res = NextResponse.redirect(url);
            // Hapus cookie sesi Supabase agar user ter-logout
            request.cookies.getAll().forEach(({ name }) => {
              if (name.startsWith("sb-")) res.cookies.delete(name);
            });
            return res;
          }
          // Belum login → langsung ke maintenance (bukan /login)
          const url = request.nextUrl.clone();
          url.pathname = "/maintenance";
          return NextResponse.redirect(url);
        }
        // Di halaman login/signup saat maintenance → arahkan ke maintenance
        if (path === "/login" || path === "/signup") {
          const url = request.nextUrl.clone();
          url.pathname = "/maintenance";
          return NextResponse.redirect(url);
        }
      }
    } catch {
      // DB tidak tersedia → biarkan lanjut normal
    }
  }

  // Belum login & buka halaman terproteksi -> lempar ke /login
  if (!user && !isPublic && !isApi) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Sudah login tapi buka /login atau /signup -> lempar ke /dashboard
  if (user && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Fitur Video masih khusus admin (sementara) -> non-admin dilempar ke /dashboard
  if (path.startsWith("/video") && !isAdmin(user?.email)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|ttf)$).*)",
  ],
};
