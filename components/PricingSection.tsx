import Link from "next/link";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/**
 * Section harga top-up token untuk landing page.
 * Ditampilkan di antara section "Coba gratis" dan FAQ.
 * Design system mengikuti Landing.tsx: navy/primary/muted + Card + LinkButton.
 */
export default function PricingSection() {
  return (
    <section id="harga" className="mx-auto max-w-6xl px-5 py-16">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-navy sm:text-3xl">
          Harga top-up token
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-muted">
          1 token = 1 konten lengkap (gambar + judul + caption). Bayar sekali pakai, tanpa langganan.
        </p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {/* Paket Mulai */}
        <Card className="flex flex-col p-6">
          <div className="text-sm font-semibold text-muted">Paket Mulai</div>
          <div className="mt-2 text-3xl font-extrabold text-navy">Rp 50.000</div>
          <div className="mt-1 text-sm text-muted">10 token · Rp 5.000/konten</div>
          <ul className="mt-5 flex flex-col gap-2 text-sm text-navy">
            <li className="flex items-start gap-2"><span className="text-primary">✓</span> 10 konten siap posting</li>
            <li className="flex items-start gap-2"><span className="text-primary">✓</span> Semua fitur AI</li>
            <li className="flex items-start gap-2"><span className="text-primary">✓</span> Token tidak hangus</li>
          </ul>
          <div className="mt-6">
            <LinkButton href="/signup" variant="secondary" className="w-full px-5 py-2.5 text-sm">
              Pilih paket
            </LinkButton>
          </div>
        </Card>

        {/* Paket Rutin — highlight */}
        <Card className="relative flex flex-col border-2 border-primary p-6 shadow-md">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-white">
            Paling populer
          </span>
          <div className="text-sm font-semibold text-primary">Paket Rutin</div>
          <div className="mt-2 text-3xl font-extrabold text-navy">Rp 135.000</div>
          <div className="mt-1 text-sm text-muted">30 token · Rp 4.500/konten</div>
          <ul className="mt-5 flex flex-col gap-2 text-sm text-navy">
            <li className="flex items-start gap-2"><span className="text-primary">✓</span> Konten sebulan (1 post/hari)</li>
            <li className="flex items-start gap-2"><span className="text-primary">✓</span> Hemat 10% dari Paket Mulai</li>
            <li className="flex items-start gap-2"><span className="text-primary">✓</span> Semua fitur AI</li>
            <li className="flex items-start gap-2"><span className="text-primary">✓</span> Token tidak hangus</li>
          </ul>
          <div className="mt-6">
            <LinkButton href="/signup" className="w-full px-5 py-2.5 text-sm">
              Pilih paket
            </LinkButton>
          </div>
        </Card>

        {/* Paket Serius */}
        <Card className="flex flex-col p-6">
          <div className="text-sm font-semibold text-muted">Paket Serius</div>
          <div className="mt-2 text-3xl font-extrabold text-navy">Rp 240.000</div>
          <div className="mt-1 text-sm text-muted">60 token · Rp 4.000/konten</div>
          <ul className="mt-5 flex flex-col gap-2 text-sm text-navy">
            <li className="flex items-start gap-2"><span className="text-primary">✓</span> 2 bulan konten harian</li>
            <li className="flex items-start gap-2"><span className="text-primary">✓</span> Hemat 20% dari Paket Mulai</li>
            <li className="flex items-start gap-2"><span className="text-primary">✓</span> Semua fitur AI</li>
            <li className="flex items-start gap-2"><span className="text-primary">✓</span> Token tidak hangus</li>
          </ul>
          <div className="mt-6">
            <LinkButton href="/signup" variant="secondary" className="w-full px-5 py-2.5 text-sm">
              Pilih paket
            </LinkButton>
          </div>
        </Card>
      </div>

      <p className="mx-auto mt-8 max-w-md text-center text-xs text-muted">
        Pembayaran via transfer bank, e-wallet (GoPay, ShopeePay, dll), dan QRIS.
      </p>
    </section>
  );
}
