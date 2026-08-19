import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/tokens";
import { Header } from "@/components/ui/Header";
import { AdminOverview } from "./AdminOverview";
import { OnboardingQuestions } from "./OnboardingQuestions";
import { MaintenanceToggle } from "./MaintenanceToggle";
import MonitorSection from "@/components/admin/MonitorSection";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) redirect("/dashboard");

  return (
    <>
      <Header />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-10 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Admin</h1>
          <p className="mt-1 text-navy/60">Aktivitas user: login terakhir, sisa token, dan pemakaian token.</p>
        </div>
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-navy/50">Status Aplikasi</h2>
          <MaintenanceToggle />
        </section>
        <MonitorSection />
        <AdminOverview />
        <OnboardingQuestions />
      </main>
    </>
  );
}