export default function PricingSection() {
  return (
    <section id="harga" className="py-16 px-4">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-3">Harga Top-Up Token</h2>
        <p className="text-gray-600 mb-10">
          1 token = 1 konten lengkap (gambar + judul + caption). Bayar sekali pakai, tanpa langganan.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Paket 10 */}
          <div className="rounded-2xl border border-gray-200 p-8 flex flex-col">
            <div className="text-lg font-semibold mb-1">Paket Mulai</div>
            <div className="text-4xl font-bold mb-1">Rp 50.000</div>
            <div className="text-gray-500 mb-6">10 token · Rp 5.000/konten</div>
            <ul className="text-left text-sm text-gray-600 space-y-2 mb-8">
              <li>✓ 10 konten siap posting</li>
              <li>✓ Semua fitur AI</li>
              <li>✓ Token tidak hangus</li>
            </ul>
            <a
              href="/signup"
              className="mt-auto rounded-xl border border-teal-600 text-teal-700 font-semibold py-3 hover:bg-teal-50 transition"
            >
              Pilih Paket
            </a>
          </div>

          {/* Paket 30 — highlight */}
          <div className="relative rounded-2xl border-2 border-teal-600 p-8 flex flex-col shadow-lg">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
              Paling Populer
            </span>
            <div className="text-lg font-semibold mb-1">Paket Rutin</div>
            <div className="text-4xl font-bold mb-1">Rp 135.000</div>
            <div className="text-gray-500 mb-6">30 token · Rp 4.500/konten</div>
            <ul className="text-left text-sm text-gray-600 space-y-2 mb-8">
              <li>✓ Konten sebulan (1 post/hari)</li>
              <li>✓ Hemat 10% dari Paket Mulai</li>
              <li>✓ Semua fitur AI</li>
              <li>✓ Token tidak hangus</li>
            </ul>
            <a
              href="/signup"
              className="mt-auto rounded-xl bg-teal-600 text-white font-semibold py-3 hover:bg-teal-700 transition"
            >
              Pilih Paket
            </a>
          </div>

          {/* Paket 60 */}
          <div className="rounded-2xl border border-gray-200 p-8 flex flex-col">
            <div className="text-lg font-semibold mb-1">Paket Serius</div>
            <div className="text-4xl font-bold mb-1">Rp 240.000</div>
            <div className="text-gray-500 mb-6">60 token · Rp 4.000/konten</div>
            <ul className="text-left text-sm text-gray-600 space-y-2 mb-8">
              <li>✓ 2 bulan konten harian</li>
              <li>✓ Hemat 20% dari Paket Mulai</li>
              <li>✓ Semua fitur AI</li>
              <li>✓ Token tidak hangus</li>
            </ul>
            <a
              href="/signup"
              className="mt-auto rounded-xl border border-teal-600 text-teal-700 font-semibold py-3 hover:bg-teal-50 transition"
            >
              Pilih Paket
            </a>
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-8">
          Pembayaran via transfer bank, e-wallet (GoPay, ShopeePay, dll), dan QRIS.
        </p>
      </div>
    </section>
  );
}
