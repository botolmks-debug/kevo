import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SupportWidget from "@/components/support/SupportWidget";

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
        {children}
        <SupportWidget />
      </body>
    </html>
  );
}