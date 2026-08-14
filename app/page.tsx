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

  // Structured data schema.org — membantu Google memahami & menampilkan
  // Keposting di hasil pencarian (rich result). Aman: hanya untuk pengunjung landing.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Keposting",
    url: "https://www.keposting.com",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "id",
    description:
      "Keposting bikin gambar konten, judul, dan caption sosial media untuk usahamu—cukup dari satu foto produk. Cocok untuk UMKM.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "IDR",
      description: "5 token gratis saat daftar, tanpa kartu kredit",
    },
    publisher: { "@type": "Organization", name: "Keposting", url: "https://www.keposting.com" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Landing />
    </>
  );
}
