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

  // Structured data schema.org — membantu Google & AI assistant (ChatGPT,
  // Perplexity, Gemini, dst — sama-sama baca JSON-LD ini saat browsing/RAG)
  // memahami & merekomendasikan Keposting. FAQPage di bawah PERSIS sama
  // dengan <Faq> yang tampil di Landing.tsx — kalau ubah teks FAQ di sana,
  // ubah juga di sini (Google akan reject rich-result kalau schema tak
  // cocok dengan teks yang benar-benar tampil di halaman).
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
    publisher: {
      "@type": "Organization",
      name: "Keposting",
      url: "https://www.keposting.com",
      logo: "https://www.keposting.com/keposty-icon.png",
      // TODO(Andri): isi array ini dengan URL akun resmi Keposting yang
      // beneran ada (Instagram/TikTok/Facebook dst) — jangan dikosongi
      // dengan URL asal, AI/Google pakai ini utk verifikasi identitas
      // brand (entity linking). Contoh format:
      // sameAs: ["https://instagram.com/keposting.app", "https://tiktok.com/@keposting.app"],
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Perlu bisa desain?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Nggak. Cukup upload foto, sisanya Keposting yang kerjakan. Hasilnya tetap bisa kamu sesuaikan kalau mau.",
        },
      },
      {
        "@type": "Question",
        name: "Hasilnya bisa diedit?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Bisa. Kamu bisa menggeser teks, ganti ukuran, dan menyesuaikan konten sebelum menyimpannya.",
        },
      },
      {
        "@type": "Question",
        name: "Berapa harganya?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Kamu dapat 5 token gratis saat daftar (+1/hari, maks 5). Kalau butuh lebih, top-up mulai Rp 50.000 untuk 10 token, Rp 135.000 untuk 30 token, atau Rp 240.000 untuk 60 token. Sekali bayar, tanpa langganan, token tidak hangus.",
        },
      },
      {
        "@type": "Question",
        name: "Datanya aman?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Foto dan data usahamu hanya dipakai untuk membuat kontenmu. Kamu bisa hapus kapan saja.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Landing />
    </>
  );
}
