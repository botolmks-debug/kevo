import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Landing } from "@/components/marketing/Landing";

export const dynamic = "force-dynamic";

export default async function Home() {
  let loggedIn = false;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    loggedIn = Boolean(data?.user);
  } catch {
    loggedIn = false; // tampilkan landing untuk pengunjung
  }
  // redirect() harus di LUAR try/catch (ia bekerja dengan melempar error internal)
  if (loggedIn) redirect("/dashboard");
  return <Landing />;
}
