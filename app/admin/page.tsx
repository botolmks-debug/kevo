import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/tokens";
import { Header } from "@/components/ui/Header";
import { AdminOverview } from "./AdminOverview";
import { OnboardingQuestions } from "./OnboardingQuestions";
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
        <MonitorSection />
        <AdminOverview />
        <OnboardingQuestions />
      </main>
    </>
  );
}