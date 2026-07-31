"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/generate", label: "Buat Konten" },
  { href: "/generate-otomatis", label: "Otomatis" },
  { href: "/konten", label: "Edit Konten" },
  { href: "/jadwal", label: "Jadwal" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-6 py-3.5">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold text-navy">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-white">K</span>
          Kevo
        </Link>
        <div className="flex flex-wrap items-center gap-1">
          <nav className="flex flex-wrap items-center gap-1">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    active ? "bg-primary/10 text-primary" : "text-navy/60 hover:bg-navy/5 hover:text-navy"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <button
            onClick={handleSignOut}
            className="ml-2 rounded-full px-3.5 py-1.5 text-sm font-medium text-navy/60 transition-colors hover:bg-navy/5 hover:text-navy"
          >
            Keluar
          </button>
        </div>
      </div>
    </header>
  );
}
