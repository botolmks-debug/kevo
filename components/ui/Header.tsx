"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isAdmin } from "@/lib/supabase/tokens";

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
  const [open, setOpen] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setIsAdminUser(isAdmin(data.user?.email)))
      .catch(() => {});
  }, []);

  const links = isAdminUser ? [...navLinks, { href: "/admin", label: "Admin" }] : navLinks;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function linkClass(href: string) {
    const active = pathname === href;
    return `rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
      active ? "bg-primary/10 text-primary" : "text-navy/60 hover:bg-navy/5 hover:text-navy"
    }`;
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-5 py-3.5 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold text-navy" onClick={() => setOpen(false)}>
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-white">K</span>
          Kevo
        </Link>

        {/* Menu desktop */}
        <div className="hidden items-center gap-1 md:flex">
          <nav className="flex items-center gap-1">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={linkClass(link.href)}>
                {link.label}
              </Link>
            ))}
          </nav>
          <button
            onClick={handleSignOut}
            className="ml-2 rounded-full px-3.5 py-1.5 text-sm font-medium text-navy/60 transition-colors hover:bg-navy/5 hover:text-navy"
          >
            Keluar
          </button>
        </div>

        {/* Tombol hamburger (HP) */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-navy md:hidden"
          aria-label="Menu"
          aria-expanded={open}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? (
              <>
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Dropdown menu (HP) */}
      {open ? (
        <div className="flex flex-col gap-1 border-t border-line bg-surface px-5 py-2 md:hidden">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href)} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => { setOpen(false); handleSignOut(); }}
            className="rounded-full px-3.5 py-1.5 text-left text-sm font-medium text-navy/60 hover:bg-navy/5 hover:text-navy"
          >
            Keluar
          </button>
        </div>
      ) : null}
    </header>
  );
}
