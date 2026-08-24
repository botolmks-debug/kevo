import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.keposting.com"),
  title: {
    default: "Keposting — Bikin Konten Jualan Harian dari 1 Foto",
    template: "%s · Keposting",
  },
  description:
    "Keposting bikin gambar konten, judul, dan caption sosial media untuk usahamu—cukup dari satu foto produk. Cocok untuk UMKM. Coba gratis, tanpa skill desain.",
  keywords: [
    "konten jualan otomatis",
    "caption produk AI",
    "konten sosial media UMKM",
    "generate konten instagram",
    "aplikasi bikin konten jualan",
    "bikin caption otomatis",
  ],
   icons: { icon: "/favicon.ico" },
  other: {
    "facebook-domain-verification": "huodl8bj509bvdtkbwna4ht1epap3m",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://www.keposting.com",
    siteName: "Keposting",
    title: "Keposting — Bikin Konten Jualan Harian dari 1 Foto",
    description:
      "Upload satu foto produk, dapat gambar konten + judul + caption siap posting. Otomatis, untuk UMKM.",
    images: [{ url: "/keposty-logo.png", width: 1200, height: 630, alt: "Keposting" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Keposting — Bikin Konten Jualan Harian dari 1 Foto",
    description: "Konten sosial media untuk usahamu, cukup dari satu foto. Coba gratis.",
    images: ["/keposty-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-surface text-navy">
        {/* Meta Pixel — memuat fbevents.js sekali & mencatat PageView tiap
            halaman. Event tambahan (mis. CompleteRegistration saat signup)
            dipanggil dari komponen masing-masing via window.fbq. */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
          document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '1793607721635680');
          fbq('track', 'PageView');`}
        </Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1793607721635680&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>

        {/* Google tag (gtag.js) — dipakai untuk lacak konversi Google Ads.
            Event konversi spesifik (mis. Signup Berhasil) dipanggil dari
            komponen masing-masing via window.gtag. */}
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=AW-18407073722"
          strategy="afterInteractive"
        />
        <Script id="google-tag" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'AW-18407073722');`}
        </Script>
        {children}
      </body>
    </html>
  );
}