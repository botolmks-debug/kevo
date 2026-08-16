// lib/seo/industries.ts
// Data halaman SEO "Ide Konten per Industri".
// Tambah industri baru = tambah 1 entri di array INDUSTRIES (tak perlu ubah kode halaman).

export type IdeKonten = {
  judul: string;
  deskripsi: string;
};

export type ContohCaption = {
  judul: string;
  teks: string;
};

export type Industry = {
  slug: string; // dipakai di URL: /ide-konten/[slug]
  nama: string; // "Toko Bangunan"
  metaTitle: string; // <title> — WAJIB mengandung kata kunci utama
  metaDescription: string; // meta description ~150 karakter
  intro: string[]; // paragraf pembuka, sentuh pain spesifik industri ini
  ideKonten: IdeKonten[]; // target 25 ide
  contohCaption: ContohCaption[]; // target 5 caption siap pakai
};

export const INDUSTRIES: Industry[] = [
  // ============================================================
  // 1. TOKO BANGUNAN
  // ============================================================
  {
    slug: "toko-bangunan",
    nama: "Toko Bangunan",
    metaTitle:
      "25 Ide Konten Instagram untuk Toko Bangunan (Contoh Caption Siap Pakai)",
    metaDescription:
      "Kehabisan ide posting untuk toko bangunan? 25 ide konten Instagram + 5 contoh caption siap pakai. Gratis, tinggal disesuaikan dengan tokomu.",
    intro: [
      "Toko bangunan sering dianggap bisnis yang \u201ctidak ada bahannya\u201d untuk media sosial. Padahal justru sebaliknya: setiap hari ada material baru masuk, ada tukang yang belanja, ada proyek pelanggan yang berjalan \u2014 semuanya bisa jadi konten.",
      "Masalahnya bukan bahan, tapi waktu. Habis melayani pelanggan seharian, siapa yang sempat mikir caption? Daftar di bawah ini dibuat supaya kamu tinggal pilih satu ide, foto seadanya pakai HP, dan posting hari itu juga.",
    ],
    ideKonten: [
      {
        judul: "Barang baru datang",
        deskripsi:
          "Foto tumpukan semen, cat, atau keramik yang baru diturunkan dari truk. Konten paling gampang dan paling sering ditunggu pelanggan tetap.",
      },
      {
        judul: "Perbandingan dua merek",
        deskripsi:
          "Contoh: cat merek A vs merek B \u2014 beda harga, beda daya sebar. Pelanggan suka konten yang membantu mereka memilih.",
      },
      {
        judul: "Hitung kebutuhan material",
        deskripsi:
          "\u201cKamar 3x3 butuh berapa dus keramik 40x40?\u201d Konten hitung-hitungan seperti ini paling banyak disimpan orang.",
      },
      {
        judul: "Kesalahan umum saat renovasi",
        deskripsi:
          "Misal: beli cat kurang, ukur keramik tanpa waste, campuran semen terlalu encer. Kamu lebih tahu ini daripada siapa pun.",
      },
      {
        judul: "Sebelum\u2013sesudah proyek pelanggan",
        deskripsi:
          "Minta izin pelanggan yang materialnya beli di tempatmu. Bukti nyata lebih meyakinkan daripada iklan.",
      },
      {
        judul: "Tips merawat sisa material",
        deskripsi:
          "Cara menyimpan semen sisa supaya tidak mengeras, menutup kaleng cat yang benar. Konten edukasi ringan.",
      },
      {
        judul: "Mitos vs fakta",
        deskripsi:
          "\u201cSemakin mahal cat semakin bagus?\u201d Jawab jujur berdasarkan pengalamanmu melayani ribuan pembeli.",
      },
      {
        judul: "Kenalkan tim toko",
        deskripsi:
          "Foto karyawan yang biasa melayani. Pelanggan lebih nyaman belanja di toko yang orangnya mereka kenal.",
      },
      {
        judul: "Jam ramai vs jam sepi",
        deskripsi:
          "Kasih tahu jam terbaik belanja kalau mau dilayani santai. Informasi kecil yang bikin pelanggan merasa diperhatikan.",
      },
      {
        judul: "Produk yang sering salah beli",
        deskripsi:
          "Misal beda sekrup gypsum vs sekrup kayu. Selamatkan pelanggan dari bolak-balik ke toko.",
      },
      {
        judul: "FAQ pelanggan",
        deskripsi:
          "Kumpulkan 1 pertanyaan yang paling sering ditanya minggu ini, jawab di satu post.",
      },
      {
        judul: "Promo gajian",
        deskripsi:
          "Tanggal 25\u20135 adalah momen orang mulai proyek kecil di rumah. Pasang promo di momen itu.",
      },
      {
        judul: "Estimasi biaya proyek kecil",
        deskripsi:
          "\u201cPasang pagar 6 meter habis berapa?\u201d Rincian material + kisaran harga. Konten yang dicari orang di Google juga.",
      },
      {
        judul: "Cara membaca ukuran material",
        deskripsi:
          "Beda besi 8 vs 10, beda triplek 3mm vs 9mm dan kegunaannya. Edukasi dasar yang banyak orang tidak tahu.",
      },
      {
        judul: "Barang paling laris bulan ini",
        deskripsi:
          "Orang penasaran apa yang dibeli orang lain. Sekaligus social proof untuk produk itu.",
      },
      {
        judul: "Di balik layar bongkar muat",
        deskripsi:
          "Video singkat truk datang, karyawan menurunkan barang. Konten \u201chidup\u201d yang menunjukkan toko aktif.",
      },
      {
        judul: "Tanya jawab dengan tukang langganan",
        deskripsi:
          "Tukang yang sering belanja di tokomu adalah sumber tips gratis. Rekam obrolan singkat, jadikan konten.",
      },
      {
        judul: "Perbedaan kualitas yang tak terlihat",
        deskripsi:
          "Kenapa pipa merek tertentu lebih mahal padahal kelihatan sama? Jelaskan bedanya di dalam.",
      },
      {
        judul: "Checklist renovasi kamar mandi",
        deskripsi:
          "Daftar material dari awal sampai akhir. Format checklist paling sering di-save dan di-share.",
      },
      {
        judul: "Layanan antar",
        deskripsi:
          "Ingatkan area jangkauan antar dan minimal belanja. Banyak pelanggan belum tahu tokomu bisa antar.",
      },
      {
        judul: "Musim hujan datang",
        deskripsi:
          "Konten musiman: waterproofing, talang air, cat anti bocor. Jual solusi di waktu yang tepat.",
      },
      {
        judul: "Stok menipis / barang langka",
        deskripsi:
          "Kalau ada material yang sedang susah dicari dan kamu punya, umumkan. Urgency alami tanpa dibuat-buat.",
      },
      {
        judul: "Cerita berdirinya toko",
        deskripsi:
          "Sekali-sekali cerita perjalanan toko. Konten personal seperti ini biasanya engagement-nya paling tinggi.",
      },
      {
        judul: "Kuis tebak harga",
        deskripsi:
          "\u201cTebak harga 1 sak semen sekarang?\u201d Ajak komentar, algoritma suka, kamu dapat data persepsi harga.",
      },
      {
        judul: "Testimoni pelanggan",
        deskripsi:
          "Screenshot chat WA pelanggan yang puas (sensor nomornya). Sederhana tapi paling dipercaya calon pembeli.",
      },
    ],
    contohCaption: [
      {
        judul: "Caption barang baru datang",
        teks:
          "Semen baru turun dari truk pagi ini. Stok aman, harga masih sama. Yang mau mulai proyek minggu ini, langsung merapat \u2014 atau chat dulu buat cek harga. \ud83d\udcaa\n\n#tokobangunan #bahanbangunan #renovasirumah",
      },
      {
        judul: "Caption edukasi",
        teks:
          "Kamar 3x3 meter butuh berapa dus keramik 40x40?\n\nJawabannya: 9 m\u00b2 \u00f7 (0,4 \u00d7 0,4 \u00d7 6 pcs) \u2248 10 dus (sudah termasuk cadangan potongan).\n\nSimpan post ini biar nggak salah beli. Mau dihitungkan langsung? Bawa ukuran ruanganmu ke toko, kami bantu hitung gratis.",
      },
      {
        judul: "Caption promo gajian",
        teks:
          "Gajian sudah masuk, atap masih bocor? \ud83d\ude05\n\nMinggu ini ada harga spesial untuk cat waterproofing \u2014 pas buat persiapan musim hujan. Berlaku sampai stok promo habis.",
      },
      {
        judul: "Caption testimoni",
        teks:
          "\u201cUntung tanya dulu di sini, jadi nggak kelebihan beli keramik.\u201d \u2014 Pak Rahman, renovasi dapur.\n\nBelanja material itu bukan cuma soal harga, tapi juga dihitungkan dengan benar. Itu tugas kami. \ud83d\ude4f",
      },
      {
        judul: "Caption interaksi",
        teks:
          "Tebak-tebakan sore: kira-kira 1 sak semen 50kg sekarang harganya berapa? \ud83d\udc47\n\nJawab di komentar \u2014 yang paling mendekati besok kami kasih tahu harga aslinya (dan mungkin ada kejutan kecil \ud83d\udc40).",
      },
    ],
  },

  // ============================================================
  // 2. JUALAN MAKANAN
  // ============================================================
  {
    slug: "jualan-makanan",
    nama: "Usaha Makanan",
    metaTitle:
      "25 Ide Konten Instagram untuk Jualan Makanan (Contoh Caption Siap Pakai)",
    metaDescription:
      "Bingung mau posting apa untuk jualan makanan? 25 ide konten Instagram + 5 contoh caption jualan makanan yang bisa langsung dipakai hari ini.",
    intro: [
      "Jualan makanan itu bisnis paling visual \u2014 tapi justru karena semua orang posting foto makanan, feed jadi penuh dan susah menonjol. Foto enak saja tidak cukup; yang membedakan adalah cerita di baliknya.",
      "25 ide di bawah ini dirancang supaya kamu tidak posting hal yang sama terus-menerus. Rotasi saja: hari ini jualan, besok edukasi, lusa di balik layar. Konsisten lebih penting daripada sempurna.",
    ],
    ideKonten: [
      {
        judul: "Proses masak dari awal",
        deskripsi:
          "Video singkat bumbu ditumis, adonan diuleni. Proses selalu lebih menarik daripada hasil jadi.",
      },
      {
        judul: "Menu paling laris minggu ini",
        deskripsi:
          "Umumkan juaranya. Orang cenderung pesan apa yang dipesan orang lain.",
      },
      {
        judul: "Cerita asal resep",
        deskripsi:
          "Resep warisan nenek? Hasil eksperimen gagal 10 kali? Cerita bikin makanan terasa lebih enak.",
      },
      {
        judul: "Jam produksi dini hari",
        deskripsi:
          "Foto dapur jam 4 pagi. Menunjukkan kesegaran dan kerja keras tanpa perlu bilang \u201cfresh setiap hari\u201d.",
      },
      {
        judul: "Cara terbaik menikmati",
        deskripsi:
          "\u201cEnaknya dimakan selagi hangat + sambal level 2.\u201d Arahkan pengalaman pelanggan.",
      },
      {
        judul: "Reaksi pelanggan pertama kali coba",
        deskripsi:
          "Minta izin rekam ekspresi pelanggan. Konten reaksi selalu perform.",
      },
      {
        judul: "Perbandingan porsi",
        deskripsi:
          "Porsi reguler vs jumbo berdampingan. Membantu orang memutuskan pesan yang mana.",
      },
      {
        judul: "Bahan baku pilihan",
        deskripsi:
          "Foto belanja di pasar, ayam segar datang. Jawab keraguan soal kualitas tanpa ditanya.",
      },
      {
        judul: "Kesalahan menyimpan makanan",
        deskripsi:
          "\u201cFrozen food jangan di-thawing di suhu ruang.\u201d Edukasi yang relevan dengan produkmu.",
      },
      {
        judul: "Menu tersembunyi / racikan pelanggan",
        deskripsi:
          "Kombinasi pesanan unik pelanggan yang ternyata enak. Bikin pelanggan lain penasaran mau coba.",
      },
      {
        judul: "Kuis tebak isi",
        deskripsi:
          "Foto close-up, minta tebak isinya di komentar. Cara mudah memancing interaksi.",
      },
      {
        judul: "Promo tanggal tua",
        deskripsi:
          "Paket hemat tanggal 20\u201325. Menyesuaikan momen dompet pelanggan = terasa mengerti mereka.",
      },
      {
        judul: "Batch habis / sold out",
        deskripsi:
          "Foto etalase kosong + jam berapa habisnya. Sold out adalah iklan terbaik.",
      },
      {
        judul: "Kemasan untuk oleh-oleh / hampers",
        deskripsi:
          "Tunjukkan produkmu bisa jadi hadiah. Membuka pasar baru dari produk yang sama.",
      },
      {
        judul: "Perjalanan pesanan",
        deskripsi:
          "Dari pesanan masuk \u2192 dimasak \u2192 dikemas \u2192 kurir jemput. Transparansi bikin orang percaya pesan online.",
      },
      {
        judul: "Level pedas",
        deskripsi:
          "Skala level 1\u20135 dengan deskripsi jenaka tiap level. Konten ringan yang sering di-share.",
      },
      {
        judul: "Menu untuk kondisi tertentu",
        deskripsi:
          "\u201cLagi flu? Ini menu paling pas.\u201d Hubungkan produk dengan situasi sehari-hari.",
      },
      {
        judul: "Kolaborasi dengan usaha tetangga",
        deskripsi:
          "Paket bundling dengan minuman sebelah. Saling tukar audiens tanpa biaya.",
      },
      {
        judul: "Jawab review jujur",
        deskripsi:
          "Ada kritik? Jawab terbuka dan tunjukkan perbaikannya. Lebih meyakinkan daripada pujian.",
      },
      {
        judul: "Sehari berapa porsi",
        deskripsi:
          "\u201cHari ini 120 porsi terjual, terima kasih!\u201d Angka nyata adalah social proof paling kuat.",
      },
      {
        judul: "Tips pemanasan ulang",
        deskripsi:
          "Cara terbaik menghangatkan produkmu di rumah supaya rasanya tetap seperti baru.",
      },
      {
        judul: "Menu musiman / edisi terbatas",
        deskripsi:
          "Menu Ramadan, menu musim hujan. Kelangkaan menciptakan alasan beli sekarang.",
      },
      {
        judul: "Kenalkan orang di balik dapur",
        deskripsi:
          "Siapa yang masak, siapa yang mengemas. Usaha kecil menang di sisi manusiawi ini.",
      },
      {
        judul: "Sebelum\u2013sesudah pengembangan resep",
        deskripsi:
          "Versi awal vs versi sekarang. Menunjukkan kamu terus memperbaiki produk.",
      },
      {
        judul: "Ajak vote menu baru",
        deskripsi:
          "Dua kandidat menu, minta follower pilih. Mereka merasa dilibatkan \u2014 dan sudah penasaran sebelum launching.",
      },
    ],
    contohCaption: [
      {
        judul: "Caption proses masak",
        teks:
          "Jam 4 pagi, dapur sudah hidup. Bumbu digiling sendiri \u2014 bukan karena nggak ada yang instan, tapi karena rasanya memang beda. \ud83c\udf36\ufe0f\n\nBuka jam 9. Yang biasa kehabisan, boleh pesan dari sekarang.",
      },
      {
        judul: "Caption sold out",
        teks:
          "Ludes jam 1 siang. \ud83d\ude4f\n\nMaaf untuk yang belum kebagian hari ini \u2014 besok kami tambah 20 porsi. Mau diamankan duluan? Chat aja, kami sisihkan.",
      },
      {
        judul: "Caption edukasi",
        teks:
          "Frozen food jangan dicairkan di suhu ruang ya \u2014 bakteri berkembang cepat di situ.\n\nPindahkan ke chiller semalam sebelumnya, atau langsung goreng dari beku dengan api kecil. Rasanya tetap juara, keluargamu tetap aman. Simpan tips ini! \ud83d\udccc",
      },
      {
        judul: "Caption interaksi",
        teks:
          "Tim pedas level 5, kalian masih hidup? \ud83d\udc80\ud83d\udd25\n\nKomentar di bawah: level pedas andalanmu berapa? Yang jawab level 5 tapi minumnya es teh 3 gelas, ketahuan ya.",
      },
      {
        judul: "Caption promo",
        teks:
          "Tanggal tua bukan alasan makan seadanya. \ud83d\ude24\n\nPaket hemat tanggal 20\u201325: nasi + lauk + sambal cuma [harga]. Tetap kenyang, dompet tetap selamat.",
      },
    ],
  },

  // ============================================================
  // 3. LAUNDRY — KERANGKA (isi mengikuti pola di atas)
  // ============================================================
  {
    slug: "laundry",
    nama: "Usaha Laundry",
    metaTitle:
      "25 Ide Konten Instagram untuk Usaha Laundry (Contoh Caption Siap Pakai)",
    metaDescription:
      "Usaha laundry juga butuh konten. 25 ide konten Instagram untuk laundry + contoh caption siap pakai — dari edukasi perawatan pakaian sampai promo langganan.",
    intro: [
      "Laundry termasuk usaha yang paling jarang posting \u2014 dan itu justru peluang: di kategori yang sepi konten, yang konsisten posting akan terlihat paling profesional di daerahnya.",
      "Kuncinya bukan foto mesin cuci terus-menerus, tapi jadi \u201cahli perawatan pakaian\u201d di mata pelanggan. Ide-ide di bawah ini dibuat untuk membangun posisi itu.",
    ],
    ideKonten: [
      {
        judul: "Arti simbol label pakaian",
        deskripsi:
          "Terjemahkan simbol-simbol di label baju. Konten evergreen yang selalu dicari dan di-save.",
      },
      {
        judul: "Noda membandel dan cara mengatasinya",
        deskripsi:
          "Satu noda satu post: kopi, tinta, minyak. Seri konten yang tidak ada habisnya.",
      },
      {
        judul: "Sebelum\u2013sesudah cucian",
        deskripsi:
          "Sepatu kusam jadi bersih, kemeja kuning jadi cerah. Bukti hasil kerja paling meyakinkan.",
      },
      {
        judul: "Pakaian yang tidak boleh dicuci mesin",
        deskripsi:
          "Edukasi yang menyelamatkan baju kesayangan pelanggan \u2014 dan memposisikan kamu sebagai ahlinya.",
      },
      {
        judul: "Promo paket langganan bulanan",
        deskripsi:
          "Hitung penghematan langganan vs kiloan satuan. Angka konkret lebih menjual.",
      },
    ],
    contohCaption: [
      {
        judul: "Caption edukasi noda",
        teks:
          "Noda kopi di kemeja putih? Jangan digosok! Itu justru membuat noda menyebar ke serat kain.\n\nTepuk-tepuk dengan tisu, basahi air dingin, lalu bawa ke kami sebelum 24 jam \u2014 makin cepat, makin besar peluang bersih total. \u2615",
      },
      {
        judul: "Caption promo langganan",
        teks:
          "Hitung-hitungan jujur: cuci kiloan 4x sebulan = [harga satuan x4]. Paket langganan bulanan = [harga paket]. Hematnya bisa buat jajan. \ud83d\udcb0\n\nSlot langganan bulan ini tinggal sedikit \u2014 chat untuk daftar.",
      },
    ],
  },
];

// Helper untuk halaman dinamis
export function getIndustry(slug: string): Industry | undefined {
  return INDUSTRIES.find((i) => i.slug === slug);
}

export function getAllSlugs(): string[] {
  return INDUSTRIES.map((i) => i.slug);
}
