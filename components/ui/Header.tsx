"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isAdmin } from "@/lib/supabase/tokens";
import { getLang, t, type Lang } from "@/lib/i18n";
import { PanduanWizard } from "./PanduanWizard";
import SupportWidget from "@/components/support/SupportWidget";

// "Buat Konten" = SATU menu (default /generate-otomatis — nilai jual Keposting).
// Sub-menu Otomatis/Manual ada DI DALAM halaman (BuatKontenTabs), bukan di header.
// match: prefix path yang bikin menu ini aktif (mis. /generate & /generate-otomatis).
const navLinks: { href: string; key: string; match?: string }[] = [
  { href: "/generate-otomatis", key: "nav.buatKonten", match: "/generate" },
  { href: "/gambar", key: "nav.gambar" },
  { href: "/konten", key: "nav.editKonten" },
  { href: "/jadwal", key: "nav.jadwal" },
  { href: "/videocerita", key: "nav.videoCerita" },
];
// Menu Dashboard DIHAPUS dari nav — klik logo Keposting sudah mengarah ke /dashboard.

// Menu khusus admin (botolmakassar).
const adminLinks: { href: string; key: string; match?: string }[] = [
  { href: "/video", key: "nav.video" },
  { href: "/admin", key: "nav.admin" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [lang, setLangState] = useState<Lang>("id");
  const [panduanOpen, setPanduanOpen] = useState(false);

  useEffect(() => {
    setLangState(getLang());
    createClient()
      .auth.getUser()
      .then(({ data }) => setIsAdminUser(isAdmin(data.user?.email)))
      .catch(() => {});
    // Panduan muncul OTOMATIS sekali untuk user baru (per-browser), lalu tidak lagi.
    try {
      if (!localStorage.getItem("keposty_panduan_v1")) {
        localStorage.setItem("keposty_panduan_v1", "1");
        setPanduanOpen(true);
      }
    } catch {}
  }, []);

  const links = isAdminUser ? [...navLinks, ...adminLinks] : navLinks;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function linkClass(href: string, match?: string) {
    const active = match ? pathname.startsWith(match) : pathname === href;
    return `rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
      active ? "bg-primary/10 text-primary" : "text-navy/60 hover:bg-navy/5 hover:text-navy"
    }`;
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-5 py-3.5 sm:px-6">
          <Link href="/dashboard" data-tour="/dashboard" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/keposty-icon.png" alt="Keposting" className="h-8 w-8" />
            <span className="text-lg font-bold text-navy">Keposting</span>
          </Link>

          {/* Menu desktop */}
          <div className="hidden items-center gap-1 md:flex">
            <nav className="flex items-center gap-1">
              {links.map((link) => (
                <Link key={link.href} href={link.href} data-tour={link.href} className={linkClass(link.href, link.match)}>
                  {t(link.key, lang)}
                </Link>
              ))}
            </nav>
            <button
              onClick={() => setPanduanOpen(true)}
              className="ml-1 rounded-full px-3.5 py-1.5 text-sm font-medium text-navy/60 transition-colors hover:bg-navy/5 hover:text-navy"
            >
              {t("nav.panduan", lang)}
            </button>
            <button
              onClick={handleSignOut}
              className="ml-2 rounded-full px-3.5 py-1.5 text-sm font-medium text-navy/60 transition-colors hover:bg-navy/5 hover:text-navy"
            >
              {t("nav.keluar", lang)}
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
              <Link key={link.href} href={link.href} className={linkClass(link.href, link.match)} onClick={() => setOpen(false)}>
                {t(link.key, lang)}
              </Link>
            ))}
            <button
              onClick={() => { setOpen(false); setPanduanOpen(true); }}
              className="rounded-full px-3.5 py-1.5 text-left text-sm font-medium text-navy/60 hover:bg-navy/5 hover:text-navy"
            >
              {t("nav.panduan", lang)}
            </button>
            <button
              onClick={() => { setOpen(false); handleSignOut(); }}
              className="rounded-full px-3.5 py-1.5 text-left text-sm font-medium text-navy/60 hover:bg-navy/5 hover:text-navy"
            >
              {t("nav.keluar", lang)}
            </button>
          </div>
        ) : null}

        <PanduanWizard open={panduanOpen} onClose={() => setPanduanOpen(false)} lang={lang} />
      </header>

      <SupportWidget />
    </>
  );
}