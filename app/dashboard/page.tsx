import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { langFromCookie, t } from "@/lib/i18n";
import { Header } from "@/components/ui/Header";
import { createClient } from "@/lib/supabase/server";
import { loadBusinessProfile } from "@/lib/supabase/businessProfile";
import { TokenSlot } from "@/components/dashboard/TokenSlot";
import { SocialLinks } from "@/components/dashboard/SocialLinks";
import { ContentReminderBell } from "@/components/dashboard/ContentReminderBell";
import { LogoSettings } from "./LogoSettings";
import { ImageLibrary } from "./ImageLibrary";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await loadBusinessProfile(supabase, user.id);
  if (!result.ok || !result.profile) {
    redirect("/onboarding");
  }

  const lang = langFromCookie((await cookies()).get("lang")?.value);
  const namaBisnis = result.profile.business?.name?.trim() || t("dash.fallbackName", lang);

  return (
    <>
      <Header />
      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10">
        <header className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-navy">{t("dash.greeting", lang)} {namaBisnis} 👋</h1>
            <p className="text-navy/60">{t("dash.subtitle", lang)}</p>
          </div>
          <ContentReminderBell />
        </header>

        <TokenSlot />

        <LanguageToggle />

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-navy/50">{t("dash.logo.section", lang)}</h2>
          <LogoSettings />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-navy/50">{t("dash.sec.social", lang)}</h2>
          <SocialLinks />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-navy/50">{t("dash.sec.assets", lang)}</h2>
          <ImageLibrary />
        </section>
      </main>
    </>
  );
}
