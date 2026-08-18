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
  // 3. LAUNDRY
  // ============================================================
  {
    slug: "laundry",
    nama: "Usaha Laundry",
    metaTitle:
      "25 Ide Konten Instagram untuk Usaha Laundry (Contoh Caption Siap Pakai)",
    metaDescription:
      "Bingung posting apa untuk laundry? 25 ide konten Instagram + 5 contoh caption siap pakai. Gratis, tinggal disesuaikan dengan usahamu.",
    intro: [
      "Laundry itu bisnis kepercayaan \u2014 orang menitipkan pakaian kesayangannya ke tanganmu. Tapi di Instagram, semua laundry kelihatan mirip: foto mesin cuci dan daftar harga. Padahal yang membuat orang pindah langganan bukan harga termurah, tapi rasa percaya.",
      "Kabar baiknya, kepercayaan itu bisa dibangun lewat konten. Daftar di bawah ini dibuat supaya kamu tinggal pilih satu ide, foto seadanya pakai HP, dan posting hari itu juga \u2014 tanpa perlu jadi fotografer.",
    ],
    ideKonten: [
      { judul: "Noda hilang (sebelum\u2013sesudah)", deskripsi: "Foto noda membandel sebelum dan sesudah dicuci. Ini konten paling laku untuk laundry \u2014 bukti nyata lebih meyakinkan daripada janji." },
      { judul: "Arti simbol di label baju", deskripsi: "Banyak orang tidak paham simbol setrika/cuci di label. Jelaskan satu per satu \u2014 konten edukasi yang sering disimpan." },
      { judul: "Cara rawat baju putih", deskripsi: "Tips supaya kemeja putih tidak menguning. Kamu lebih tahu ini daripada pelanggan." },
      { judul: "Proses sortir per pelanggan", deskripsi: "Tunjukkan bagaimana cucian tiap pelanggan dipisah, tidak tercampur. Membangun rasa aman." },
      { judul: "Baju luntur, gimana?", deskripsi: "Jelaskan prosedur pemisahan warna di tempatmu. Menjawab kekhawatiran nomor satu pelanggan." },
      { judul: "Behind the scenes proses", deskripsi: "Video 15 detik: cucian masuk mesin, dijemur/dikeringkan, dilipat rapi. Proses yang rapi menjual sendiri." },
      { judul: "Estimasi waktu selesai", deskripsi: "\u201cReguler 2 hari, kilat 6 jam.\u201d Informasi kecil yang paling sering ditanya di DM." },
      { judul: "Cara lipat baju biar hemat lemari", deskripsi: "Tips lipat kaus/celana ala laundry. Konten give-value yang bikin orang follow." },
      { judul: "Paket langganan bulanan", deskripsi: "Tawarkan paket cuci mingguan untuk anak kos/keluarga sibuk. Ubah pembeli sekali jadi pelanggan tetap." },
      { judul: "Kenalkan tim laundry", deskripsi: "Foto orang yang mencuci & melipat. Pelanggan lebih tenang menitipkan baju ke orang yang dikenal." },
      { judul: "Jenis parfum laundry", deskripsi: "Pamerkan pilihan wangi yang tersedia. Ajak pelanggan pilih favorit lewat polling story." },
      { judul: "Kesalahan mencuci di rumah", deskripsi: "Misal: campur handuk baru dengan baju, air terlalu panas untuk sablon. Posisikan dirimu sebagai ahli." },
      { judul: "Cuci sepatu / tas / boneka", deskripsi: "Kalau terima cuci selain baju, pamerkan. Banyak orang tidak tahu kamu melayani ini." },
      { judul: "Testimoni pelanggan", deskripsi: "Screenshot chat pujian (blur nomornya) atau video singkat pelanggan. Bukti sosial sederhana." },
      { judul: "Antar-jemput gratis", deskripsi: "Kalau ada layanan pickup, jadikan konten. Kemudahan ini yang bikin orang malas pindah." },
      { judul: "Cara hilangkan bau apek", deskripsi: "Tips supaya baju simpanan lama tidak apek. Edukasi ringan yang relatable." },
      { judul: "Hitungan kiloan vs satuan", deskripsi: "Jelaskan kapan lebih hemat kiloan, kapan satuan. Transparansi membangun kepercayaan." },
      { judul: "Promo hari tertentu", deskripsi: "Misal diskon Senin sepi atau paket keluarga akhir pekan. Ratakan beban kerja sekaligus jualan." },
      { judul: "Merawat mukena / baju ibadah", deskripsi: "Cara mencuci mukena, sajadah, baju koko biar awet & wangi. Konten musiman jelang hari besar." },
      { judul: "Fakta menarik seputar cucian", deskripsi: "\u201cSatu keluarga rata-rata cuci 6 kg/minggu.\u201d Angka kecil yang bikin orang berhenti scroll." },
      { judul: "Tanya-jawab (FAQ)", deskripsi: "\u201cBisa titip hari Minggu?\u201d Kumpulkan pertanyaan yang sering masuk, jawab dalam satu post." },
      { judul: "Kapasitas & jam operasional", deskripsi: "Dibuat menarik, bukan sekadar info kaku \u2014 misal \u201ctitip sebelum jam 10, selesai besok pagi.\u201d" },
      { judul: "Perawatan alat: kebersihan mesin", deskripsi: "Tunjukkan mesin dibersihkan rutin. Menepis kekhawatiran cucian tercampur kotoran orang lain." },
      { judul: "Cerita awal buka laundry", deskripsi: "Kisah kenapa kamu memulai usaha ini. Orang beli dari orang, bukan dari logo." },
      { judul: "Checklist yang bisa di-save", deskripsi: "\u201c5 hal cek dulu sebelum menitip laundry.\u201d Konten give-value yang layak disimpan pelanggan." },
    ],
    contohCaption: [
      { judul: "Sebelum\u2013sesudah", teks: "Noda kunyit di kemeja putih. Kata orang: mustahil hilang. \ud83d\udc55\n\nGeser untuk lihat hasilnya. \u27a1\ufe0f\n\nBukan sulap \u2014 cuma penanganan yang benar sebelum nodanya \u201cmenetap\u201d. Makin cepat diantar, makin besar peluang selamat.\n\n#laundry #nodamembandel #laundryterdekat" },
      { judul: "Bangun kepercayaan", teks: "Cucianmu tidak pernah tercampur dengan punya orang lain. \ud83e\uddfa\n\nSetiap pelanggan punya keranjang & label sendiri dari masuk sampai selesai. Baju kesayanganmu kami jaga seperti punya sendiri.\n\nTitip sekarang, besok sudah wangi & rapi. \ud83d\ude4c\n\n#laundrybersih #laundryterpercaya" },
      { judul: "Paket langganan", teks: "Capek nyuci tiap minggu? Serahkan ke kami. \ud83e\uddfa\n\nPaket langganan bulanan: cucian mingguan, jemput-antar gratis, wangi pilihanmu.\n\nWaktu weekend-mu terlalu berharga buat dihabiskan di mesin cuci. \ud83d\ude09\n\nDM \u201cLANGGANAN\u201d untuk harga. \ud83d\udc47\n\n#laundrylangganan #jasalaundry" },
      { judul: "Edukasi label", teks: "Pernah bingung sama simbol di label baju? \ud83e\udd14\n\n\u25a1 dengan titik = boleh dikeringkan mesin\n\u25b3 dicoret = jangan pakai pemutih\nSetrika 1 titik = suhu rendah (untuk bahan halus)\n\nSalah baca = baju rusak. Atau\u2026 titip ke kami saja, biar kami yang pusing. \ud83d\ude04\n\n#tipslaundry #rawatbaju" },
      { judul: "Testimoni", teks: "\u201cKak, jaket kesayanganku yang kena oli akhirnya bersih lagi \ud83e\udd79\u201d\n\nChat seperti ini yang bikin kerja sampai malam rasanya worth it. \ud83d\ude4f\n\nTerima kasih sudah mempercayakan baju kesayanganmu ke kami.\n\n#testimonilaundry #laundrymakassar" },
    ],
    },

  // ============================================================
  // 4. SALON & BARBERSHOP
  // ============================================================
  {
    slug: "salon-barbershop",
    nama: "Salon & Barbershop",
    metaTitle:
      "25 Ide Konten Instagram untuk Salon & Barbershop (Contoh Caption Siap Pakai)",
    metaDescription:
      "Kehabisan ide konten untuk salon atau barbershop? 25 ide Instagram + 5 caption siap pakai. Gratis, tinggal sesuaikan dengan usahamu.",
    intro: [
      "Salon dan barbershop punya keunggulan yang jarang dimiliki bisnis lain: hasil kerjamu terlihat langsung dan sangat visual. Satu potongan rambut yang rapi, satu wajah pelanggan yang puas \u2014 itu sudah konten.",
      "Tapi banyak salon berhenti di foto hasil saja, lalu kehabisan ide. Daftar di bawah ini memberi 25 sudut berbeda supaya feed-mu tidak monoton dan pelanggan baru yakin memilihmu sebelum datang.",
    ],
    ideKonten: [
      { judul: "Sebelum\u2013sesudah potong rambut", deskripsi: "Transformasi paling memuaskan untuk ditonton. Minta izin pelanggan dulu. Konten andalan yang tak pernah gagal." },
      { judul: "Video proses (timelapse)", deskripsi: "Percepat proses potong/cat/styling jadi 15 detik. Sangat memuaskan ditonton dan gampang viral." },
      { judul: "Rekomendasi model sesuai bentuk wajah", deskripsi: "\u201cWajah bulat cocok potongan apa?\u201d Konten edukasi yang membantu pelanggan memutuskan." },
      { judul: "Tips rawat rambut di rumah", deskripsi: "Cara jaga hasil catok/warna biar awet. Give-value yang bikin follow." },
      { judul: "Kenalkan kapster/hairstylist", deskripsi: "Foto & keahlian tiap tim. Pelanggan sering datang karena orangnya, bukan cuma tempatnya." },
      { judul: "Produk yang dipakai", deskripsi: "Pomade, serum, cat merek apa. Bangun kesan profesional dan bisa jadi jualan tambahan." },
      { judul: "Harga & paket layanan", deskripsi: "Dibuat jelas & menarik. Transparansi harga mengurangi keraguan calon pelanggan." },
      { judul: "Suasana tempat", deskripsi: "Tunjukkan interior yang nyaman/bersih. Kenyamanan tempat bagian dari alasan orang balik." },
      { judul: "Cara booking / antre", deskripsi: "Jelaskan sistem janji temu biar pelanggan tidak menunggu lama. Kemudahan menjual." },
      { judul: "Model kekinian bulan ini", deskripsi: "Tren potongan/warna yang sedang ramai. Posisikan salonmu selalu update." },
      { judul: "Kesalahan potong rambut sendiri", deskripsi: "Bahaya potong poni sendiri, cat rumahan gagal. Relatable dan lucu." },
      { judul: "Testimoni pelanggan", deskripsi: "Video singkat atau screenshot pujian. Bukti sosial paling kuat." },
      { judul: "Promo hari sepi", deskripsi: "Diskon Senin\u2013Kamis untuk ratakan antrean. Jualan sekaligus atur jadwal." },
      { judul: "Perawatan khusus (creambath, spa rambut)", deskripsi: "Pamerkan layanan yang belum semua orang tahu kamu punya." },
      { judul: "Fakta seputar rambut", deskripsi: "\u201cRambut tumbuh ~1 cm/bulan.\u201d Fakta ringan yang menghentikan scroll." },
      { judul: "Grooming untuk pria", deskripsi: "Tips rapikan jenggot, rawat kulit kepala. Konten khusus segmen barbershop." },
      { judul: "Paket pengantin / acara", deskripsi: "Tawarkan makeup + hairdo untuk acara. Konten musiman bernilai tinggi." },
      { judul: "Behind the scenes buka toko", deskripsi: "Ritual pagi sebelum pelanggan datang. Membangun kedekatan." },
      { judul: "Q&A dengan kapster", deskripsi: "Jawab pertanyaan umum: \u201cberapa lama sekali potong?\u201d Bangun otoritas." },
      { judul: "Koleksi hasil (portofolio)", deskripsi: "Kumpulan potongan terbaik bulan ini dalam satu carousel. Pamer skill." },
      { judul: "Reaksi pelanggan lihat hasil", deskripsi: "Momen jujur pelanggan bercermin. Emosi asli menjual." },
      { judul: "Layanan anak / keluarga", deskripsi: "Kalau ramah anak, tunjukkan. Menarik segmen keluarga." },
      { judul: "Cerita awal buka salon", deskripsi: "Kisah perjalananmu. Orang mendukung usaha yang punya cerita." },
      { judul: "Tips pilih warna rambut sesuai kulit", deskripsi: "Panduan singkat yang layak disimpan pelanggan." },
      { judul: "Jam ramai & saran datang", deskripsi: "Kasih tahu jam sepi biar pelanggan bisa santai. Perhatian kecil yang dihargai." },
    ],
    contohCaption: [
      { judul: "Transformasi", teks: "Dari begini\u2026 jadi begini. \u2702\ufe0f\u2728\n\nGeser untuk lihat transformasinya. \u27a1\ufe0f\n\nPotongan yang tepat bisa bikin wajah kelihatan lebih fresh tanpa perlu ubah apa pun. \ud83d\ude0e\n\nBooking slot-mu: [nomor WA]\n\n#barbershop #potongrambut #haircut" },
      { judul: "Rekomendasi model", teks: "Bingung mau potong model apa? \ud83e\udd14\n\nWajah bulat \u2192 potongan berlayer, tambah volume di atas\nWajah kotak \u2192 sisi lebih pendek, softening di rahang\nWajah oval \u2192 hampir semua model cocok (kamu beruntung \ud83d\ude04)\n\nDatang aja, biar kami bantu pilih yang paling pas. \u2728\n\n#tipsrambut #salon" },
      { judul: "Promo hari sepi", teks: "Senin\u2013Kamis males keluar? Justru waktu terbaik. \ud83d\ude09\n\nDiskon 20% khusus hari kerja \u2014 tanpa antre, dilayani santai, hasil tetap maksimal.\n\nWeekend biar buat yang sibuk. Kamu yang santai, dapat harga santai juga. \u2702\ufe0f\n\n#promopotongrambut #barbershopmakassar" },
      { judul: "Rawat hasil", teks: "Baru catok/smoothing? Jangan langsung keramas 3 hari ya! \ud83d\udeab\ud83d\udca7\n\n\u2705 Tidur dengan rambut lurus tergerai\n\u2705 Hindari ikat terlalu kencang\n\u2705 Pakai sampo khusus rambut treatment\n\nHasil bagus itu 50% di kami, 50% di perawatanmu di rumah. \ud83d\ude4c\n\n#tipsrambut #smoothing" },
      { judul: "Testimoni", teks: "\u201cUdah 3 tahun potong di sini, gak mau pindah \ud83d\ude4f\u201d\n\nPelanggan setia seperti ini alasan kami tetap semangat tiap hari. Terima kasih sudah percaya! \u2728\n\nBelum pernah ke sini? Yuk, buktikan sendiri. \ud83d\ude0a\n\n#testimoni #barbershopterbaik" },
    ],
    },

  // ============================================================
  // 5. BENGKEL MOTOR
  // ============================================================
  {
    slug: "bengkel-motor",
    nama: "Bengkel Motor",
    metaTitle:
      "25 Ide Konten Instagram untuk Bengkel Motor (Contoh Caption Siap Pakai)",
    metaDescription:
      "Bingung posting apa untuk bengkel motor? 25 ide konten Instagram + 5 contoh caption siap pakai. Gratis, tinggal sesuaikan dengan bengkelmu.",
    intro: [
      "Bengkel motor jarang dianggap \u201cInstagramable\u201d \u2014 padahal justru di sinilah kepercayaan dibangun. Pemilik motor ingin tahu bengkel mana yang jujur, tidak asal ganti part, dan paham mesin. Konten adalah cara membuktikannya sebelum mereka datang.",
      "Kamu tidak perlu jago fotografi. Cukup HP dan pengetahuan yang sudah kamu punya tiap hari. Daftar di bawah membantu mengubah keahlianmu jadi konten yang menarik pelanggan baru.",
    ],
    ideKonten: [
      { judul: "Tanda-tanda motor perlu servis", deskripsi: "Suara aneh, tarikan berat, boros bensin. Edukasi yang bikin orang cek motornya \u2014 lalu datang." },
      { judul: "Sebelum\u2013sesudah (part kotor vs baru)", deskripsi: "Foto busi/filter/rantai sebelum & sesudah. Bukti visual kenapa servis rutin penting." },
      { judul: "Jadwal servis berkala", deskripsi: "\u201cGanti oli tiap 2.000 km.\u201d Konten yang sering disimpan pemilik motor." },
      { judul: "Cara rawat motor sendiri", deskripsi: "Cek angin ban, panasin motor, bersihkan rantai. Give-value membangun kepercayaan." },
      { judul: "Mitos vs fakta otomotif", deskripsi: "\u201cOli mahal pasti lebih bagus?\u201d Jawab jujur berdasarkan pengalaman. Posisikan diri sebagai ahli." },
      { judul: "Kenalkan mekanik", deskripsi: "Foto & spesialisasi tiap mekanik. Pelanggan lebih percaya bengkel yang orangnya dikenal." },
      { judul: "Beda oli & fungsinya", deskripsi: "Jelaskan kode oli (10W-40 dll) sederhana. Edukasi yang jarang dijelaskan bengkel lain." },
      { judul: "Layanan yang tersedia", deskripsi: "Servis, ganti part, cuci steam, modif ringan. Banyak orang tidak tahu kamu melayani semua." },
      { judul: "Harga jasa transparan", deskripsi: "Kisaran biaya servis rutin. Transparansi = pembeda dari bengkel \u201cnakal\u201d." },
      { judul: "Kesalahan pemilik motor", deskripsi: "Telat ganti oli, isi bensin salah oktan. Selamatkan pelanggan dari kerusakan." },
      { judul: "Behind the scenes perbaikan", deskripsi: "Video singkat bongkar mesin & pasang lagi. Proses menunjukkan keahlian." },
      { judul: "Testimoni pelanggan", deskripsi: "Screenshot/video pelanggan puas. Terutama kasus motor yang tadinya rewel jadi normal." },
      { judul: "Part asli vs KW", deskripsi: "Cara bedakan part orisinal. Edukasi yang membangun kepercayaan besar." },
      { judul: "Tips hemat bensin", deskripsi: "Kebiasaan berkendara yang irit. Konten relatable untuk semua pemilik motor." },
      { judul: "Promo servis paketan", deskripsi: "Ganti oli + servis ringan harga khusus. Jualan sekaligus kasih nilai." },
      { judul: "Cerita kasus unik", deskripsi: "Motor dengan masalah aneh yang berhasil diperbaiki. Bercerita = engagement." },
      { judul: "Persiapan motor untuk mudik", deskripsi: "Checklist sebelum perjalanan jauh. Konten musiman bernilai tinggi." },
      { judul: "Cara pilih ban sesuai kebutuhan", deskripsi: "Ban harian vs touring vs basah. Panduan yang membantu keputusan beli." },
      { judul: "Fakta menarik mesin motor", deskripsi: "\u201cMesin dingin lebih boros saat pertama nyala.\u201d Fakta yang menghentikan scroll." },
      { judul: "Q&A seputar motor", deskripsi: "Kumpulkan pertanyaan pelanggan, jawab dalam satu post. Bangun otoritas." },
      { judul: "Jam buka & antre", deskripsi: "Jam sepi biar servis cepat. Informasi kecil yang dihargai." },
      { judul: "Steam / cuci motor", deskripsi: "Kalau ada layanan cuci, pamerkan hasil kinclong. Sebelum\u2013sesudah selalu menang." },
      { judul: "Alat & peralatan bengkel", deskripsi: "Tunjukkan alat lengkap/modern. Membangun kesan bengkel serius." },
      { judul: "Cerita awal buka bengkel", deskripsi: "Perjalananmu dari nol. Orang mendukung usaha yang punya kisah." },
      { judul: "Checklist beli motor bekas", deskripsi: "Yang wajib dicek sebelum beli motkas. Give-value yang layak disimpan." },
    ],
    contohCaption: [
      { judul: "Edukasi tanda servis", teks: "Motor mulai bunyi \u201ckasar\u201d pas digas? Jangan diabaikan. \ud83d\udee0\ufe0f\n\nBiasanya tanda: oli sudah waktunya ganti, atau rantai minta perhatian. Dibiarkan = kerusakan makin mahal.\n\nMampir, kami cek gratis dulu sebelum kamu putuskan. \ud83d\udc4d\n\n#bengkelmotor #servismotor #tipsmotor" },
      { judul: "Sebelum\u2013sesudah part", teks: "Ini busi motor pelanggan tadi. Geser lihat yang baru. \u27a1\ufe0f\n\nHitam kerak vs bersih \u2014 bedanya berasa langsung di tarikan & irit bensin.\n\nKapan terakhir cek businya? \ud83e\udd14\n\n#businmotor #servisberkala #bengkelterdekat" },
      { judul: "Transparansi harga", teks: "Takut ke bengkel karena biaya \u201cngambang\u201d? Di sini enggak. \ud83d\udcb0\n\nServis rutin: mulai Rp[isi]\nGanti oli: mulai Rp[isi]\nCek diagnosa: GRATIS\n\nKami kasih tahu dulu apa yang rusak & biayanya, baru dikerjakan. Tanpa kejutan. \ud83e\udd1d\n\n#bengkeljujur #servismotor" },
      { judul: "Give value", teks: "3 hal yang bikin motormu cepat rusak (tanpa sadar): \ud83c\udfcd\ufe0f\n\n1\ufe0f\u20e3 Telat ganti oli \u2014 mesin \u201ckering\u201d, gesekan naik\n2\ufe0f\u20e3 Ban kurang angin \u2014 boros bensin + ban cepat botak\n3\ufe0f\u20e3 Jarang panasin \u2014 oli belum naik, langsung digas kencang\n\nSave dulu, ingatkan dirimu nanti. \ud83d\udccc\n\n#tipsmotor #rawatmotor" },
      { judul: "Testimoni", teks: "\u201cMotor yang bengkel lain bilang harus turun mesin, di sini beres cuma ganti [part] \ud83d\ude4f\u201d\n\nKami cek dulu akar masalahnya, bukan asal ganti yang mahal. Terima kasih sudah percaya! \ud83d\udee0\ufe0f\n\n#testimoni #bengkelterpercaya" },
    ],
    },

  // ============================================================
  // 6. OLSHOP FASHION
  // ============================================================
  {
    slug: "olshop-fashion",
    nama: "Olshop Fashion",
    metaTitle:
      "25 Ide Konten Instagram untuk Olshop Fashion (Contoh Caption Siap Pakai)",
    metaDescription:
      "Kehabisan ide konten untuk olshop baju? 25 ide Instagram + 5 caption siap pakai. Gratis, tinggal sesuaikan dengan tokomu.",
    intro: [
      "Olshop fashion bersaing di feed yang penuh sesak \u2014 ratusan toko menjual barang mirip. Yang membedakan bukan produknya saja, tapi bagaimana kamu menampilkannya dan membangun karakter toko yang diingat.",
      "Foto produk polos saja tidak cukup lagi. Daftar di bawah memberi 25 sudut konten supaya feed-mu punya kepribadian, membangun kepercayaan, dan mengubah penonton jadi pembeli.",
    ],
    ideKonten: [
      { judul: "Outfit of the day (OOTD)", deskripsi: "Pakai produkmu di kehidupan nyata. Orang beli \u201ctampilan\u201d, bukan cuma baju di hanger." },
      { judul: "Mix & match satu item", deskripsi: "Satu kemeja, 3 gaya berbeda. Tunjukkan produk serbaguna \u2014 nilai lebih untuk pembeli." },
      { judul: "Detail bahan (close-up)", deskripsi: "Zoom tekstur kain, jahitan, kancing. Menjawab kekhawatiran \u201ckualitasnya gimana?\u201d" },
      { judul: "Restock item favorit", deskripsi: "\u201cReady lagi!\u201d untuk barang yang sempat habis. Ciptakan urgensi jujur." },
      { judul: "Panduan ukuran (size chart)", deskripsi: "Cara ukur badan sendiri. Kurangi salah beli & retur \u2014 sekaligus konten berguna." },
      { judul: "Behind the scenes packing", deskripsi: "Proses bungkus pesanan yang rapi. Bikin calon pembeli yakin barang sampai aman." },
      { judul: "Testimoni & foto pelanggan", deskripsi: "Repost pembeli yang pakai produkmu (izin dulu). Bukti sosial paling meyakinkan." },
      { judul: "Tips padu-padan warna", deskripsi: "Warna apa cocok dengan apa. Give-value yang bikin follow walau belum beli." },
      { judul: "New arrival", deskripsi: "Koleksi baru dengan foto menarik. Beri alasan pelanggan lama cek feed-mu terus." },
      { judul: "Cara rawat baju biar awet", deskripsi: "Cuci/simpan bahan tertentu. Menunjukkan kamu peduli setelah barang terjual." },
      { judul: "Flash sale / promo terbatas", deskripsi: "Diskon waktu terbatas. Urgensi mendorong keputusan cepat." },
      { judul: "Rekomendasi outfit per acara", deskripsi: "\u201cOOTD kondangan\u201d, \u201coutfit kerja\u201d. Bantu pembeli membayangkan pemakaian." },
      { judul: "Kesalahan padu-padan umum", deskripsi: "Yang bikin outfit terlihat \u201cnggak nyambung\u201d. Edukasi ringan & relatable." },
      { judul: "Kenalkan pemilik / tim", deskripsi: "Wajah di balik toko. Olshop dengan orang nyata lebih dipercaya daripada akun anonim." },
      { judul: "Bandingkan model / warna", deskripsi: "\u201cTim hitam atau tim krem?\u201d Ajak pembeli memilih lewat polling story." },
      { judul: "Tren fashion terkini", deskripsi: "Gaya yang sedang naik. Posisikan tokomu selalu update." },
      { judul: "Paket / bundling hemat", deskripsi: "Beli 2 lebih murah, set atasan+bawahan. Naikkan nilai per transaksi." },
      { judul: "Proses dari supplier ke toko", deskripsi: "Kalau produksi/kurasi sendiri, ceritakan. Membangun nilai & keaslian." },
      { judul: "Fakta / tips fashion", deskripsi: "\u201cWarna netral itu investasi lemari.\u201d Konten yang layak disimpan." },
      { judul: "Q&A seputar produk", deskripsi: "\u201cBahannya panas nggak?\u201d Kumpulkan & jawab dalam satu post. Kurangi DM berulang." },
      { judul: "Cara order & pembayaran", deskripsi: "Langkah belanja dibuat jelas & mudah. Kurangi calon pembeli yang bingung lalu kabur." },
      { judul: "Koleksi best seller", deskripsi: "Produk paling laku bulan ini. Social proof + bantu pembeli baru memilih." },
      { judul: "Konten musiman", deskripsi: "Koleksi Lebaran, outfit tahun baru, seragam keluarga. Manfaatkan momen belanja." },
      { judul: "Cerita awal buka olshop", deskripsi: "Kisah mulai dari nol / kamar kos. Perjalanan membangun kedekatan dengan pembeli." },
      { judul: "Styling untuk berbagai bentuk tubuh", deskripsi: "Rekomendasi potongan yang menyanjung. Konten inklusif yang dihargai & dibagikan." },
    ],
    contohCaption: [
      { judul: "Mix & match", teks: "Satu kemeja, tiga gaya. \ud83d\udc55\u2728\n\n1\ufe0f\u20e3 Kancing rapi + celana bahan \u2192 ke kantor\n2\ufe0f\u20e3 Lengan digulung + jeans \u2192 hangout\n3\ufe0f\u20e3 Dipakai terbuka + inner \u2192 gaya santai\n\nBeli satu, dapat banyak tampilan. Itu baru hemat. \ud83d\ude09\n\nOrder: [link/WA]\n\n#ootd #fashionmurah #mixandmatch" },
      { judul: "Restock urgensi", teks: "READY LAGI yang kemarin diburu! \ud83d\udd25\n\nUkuran sempat habis dalam 2 hari. Sekarang restock \u2014 tapi jumlah terbatas.\n\nYang kemarin nunggu di keranjang, ini saatnya. Jangan sampai kehabisan lagi ya. \ud83d\ude4c\n\n#restock #olshop #fashionwanita" },
      { judul: "Detail bahan", teks: "\u201cKualitasnya gimana kak?\u201d \u2014 nih, lihat sendiri. \ud83d\udd0d\n\nBahan katun premium, adem, tidak nerawang, jahitan rapi double-stitch.\n\nKami tampilkan apa adanya. Yang datang harus sesuai yang di foto \u2014 itu prinsip kami. \ud83e\udd1d\n\n#detailproduk #olshopjujur" },
      { judul: "Panduan ukuran", teks: "Takut salah ukuran pas belanja online? Ini triknya. \ud83d\udccf\n\nAmbil baju kesayangan yang paling pas di badan, ukur:\n\u2022 Lebar dada (dari ketiak ke ketiak)\n\u2022 Panjang baju (bahu ke bawah)\n\nCocokkan dengan size chart kami. Bingung? DM aja, kami bantu pilih. \ud83d\ude0a\n\n#sizechart #tipsbelanjaonline" },
      { judul: "Testimoni pelanggan", teks: "Pelanggan kami pakai [produk] ke acara kemarin \ud83e\udd79\u2728\n\nLihat sendiri jatuhnya di badan \u2014 ini bukan foto model, ini pembeli asli.\n\nMakasih sudah pilih kami untuk momen spesialmu! \ud83d\ude4f\n\n#testimoni #ootdpelanggan #fashionlokal" },
    ],
    },
    // ============================================================
  // PET SHOP
  // Cara pakai: SALIN seluruh blok objek di bawah ini (dari `{` sampai `},`)
  // lalu TEMPEL ke dalam array INDUSTRIES di lib/seo/industries.ts —
  // taruh SEBELUM tanda `];` yang menutup array. JANGAN menimpa seluruh file.
  // ============================================================
  {
    slug: "pet-shop",
    nama: "Pet Shop",
    metaTitle:
      "25 Ide Konten Instagram untuk Pet Shop (Contoh Caption Siap Pakai)",
    metaDescription:
      "Bingung mau posting apa untuk pet shop? 25 ide konten Instagram + 5 contoh caption siap pakai. Gratis, tinggal disesuaikan dengan tokomu.",
    intro: [
      "Pet shop punya modal konten yang tidak dimiliki bisnis lain: setiap hari ada hewan lucu di depan mata. Anjing yang baru grooming, kucing yang tidur di rak makanan, pelanggan yang gemas milih mainan \u2014 semuanya berhenti jempol orang saat scroll.",
      "Masalahnya, sibuk ngurus hewan seharian bikin nggak sempat mikir caption. Daftar di bawah ini dibuat supaya kamu tinggal pilih satu ide, foto seadanya pakai HP, dan posting hari itu juga \u2014 tanpa pusing.",
    ],
    ideKonten: [
      {
        judul: "Sebelum\u2013sesudah grooming",
        deskripsi:
          "Foto anjing/kucing sebelum dan sesudah dimandikan atau dicukur. Konten transformasi paling gampang viral dan paling sering dibagikan.",
      },
      {
        judul: "Produk baru datang",
        deskripsi:
          "Makanan, mainan, atau aksesori baru yang baru masuk. Pelanggan tetap suka tahu stok terbaru sebelum kehabisan.",
      },
      {
        judul: "Tips merawat hewan",
        deskripsi:
          "Cara memandikan kucing yang takut air, seberapa sering anjing perlu grooming. Konten edukasi yang paling banyak disimpan orang.",
      },
      {
        judul: "Rekomendasi makanan sesuai usia",
        deskripsi:
          "Makanan untuk anak kucing beda dengan kucing dewasa. Bantu pelanggan memilih, mereka akan balik ke tokomu untuk tanya lagi.",
      },
      {
        judul: "Hewan pelanggan yang mampir",
        deskripsi:
          "Minta izin foto hewan pelanggan yang lagi belanja atau grooming. Bukti nyata toko ramai lebih meyakinkan daripada iklan.",
      },
      {
        judul: "Mitos vs fakta soal hewan",
        deskripsi:
          "\u201cKucing nggak boleh mandi?\u201d, \u201cAnjing makan tulang ayam aman?\u201d Jawab jujur berdasarkan pengalamanmu. Konten ini memicu banyak komentar.",
      },
      {
        judul: "Tanda hewan sakit yang perlu diwaspadai",
        deskripsi:
          "Gejala umum yang pemilik sering telat sadar. Konten yang menyelamatkan hewan sekaligus bikin tokomu dipercaya.",
      },
      {
        judul: "Kenalkan tim toko",
        deskripsi:
          "Foto groomer atau kasir yang biasa melayani. Pelanggan lebih nyaman ke toko yang orangnya mereka kenal.",
      },
      {
        judul: "Proses grooming di balik layar",
        deskripsi:
          "Rekam pendek proses mandi\u2013keringkan\u2013cukur. Orang suka melihat hewan mereka ditangani dengan telaten.",
      },
      {
        judul: "Perbandingan dua merek makanan",
        deskripsi:
          "Merek A vs merek B \u2014 beda harga, beda kandungan. Pelanggan suka konten yang membantu mereka memilih.",
      },
      {
        judul: "Adopsi / cari rumah baru",
        deskripsi:
          "Kalau kamu bantu penyaluran hewan, posting yang cari adopter. Konten bermakna yang sering dibagikan ulang.",
      },
      {
        judul: "Aksesori lucu minggu ini",
        deskripsi:
          "Baju, kalung, atau bandana baru. Pakaikan ke hewan display atau hewan pelanggan (izin dulu) untuk foto yang menggemaskan.",
      },
      {
        judul: "Jadwal vaksin & obat cacing",
        deskripsi:
          "Ingatkan pemilik soal jadwal rutin. Konten pengingat begini bikin tokomu terasa peduli, bukan cuma jualan.",
      },
      {
        judul: "Kesalahan umum pemilik baru",
        deskripsi:
          "Salah kasih makan, kandang terlalu sempit, telat steril. Kamu lebih tahu ini daripada pemilik pemula.",
      },
      {
        judul: "Hewan display toko",
        deskripsi:
          "Kalau ada kucing/anjing toko, jadikan maskot. Update tingkahnya rutin \u2014 pelanggan bisa datang cuma buat lihat dia.",
      },
      {
        judul: "Tebak jenis / ras hewan",
        deskripsi:
          "\u201cKira-kira ini ras apa?\u201d Ajak komentar. Algoritma suka interaksi, kamu dapat engagement gratis.",
      },
      {
        judul: "Testimoni pelanggan",
        deskripsi:
          "Screenshot chat pelanggan yang puas dengan grooming atau produk (sensor nomornya). Sederhana tapi paling dipercaya.",
      },
      {
        judul: "Paket hemat / bundling",
        deskripsi:
          "Makanan + vitamin + mainan dalam satu paket. Tunjukkan hitungan hematnya biar pelanggan tergerak.",
      },
      {
        judul: "Cara memilih kandang yang tepat",
        deskripsi:
          "Ukuran kandang sesuai jenis dan berat hewan. Konten panduan yang bikin pelanggan tanya lebih lanjut.",
      },
      {
        judul: "Momen lucu di toko",
        deskripsi:
          "Hewan yang tingkahnya menggemaskan atau kocak. Konten ringan yang bikin orang senyum dan follow.",
      },
      {
        judul: "Cerita berdirinya toko",
        deskripsi:
          "Sekali-sekali cerita kenapa kamu buka pet shop. Konten personal biasanya engagement-nya paling tinggi.",
      },
      {
        judul: "Promo grooming hari sepi",
        deskripsi:
          "Diskon grooming di hari yang biasanya sepi (misal Senin\u2013Selasa). Bikin jadwal groomer lebih merata.",
      },
      {
        judul: "Q&A seputar hewan",
        deskripsi:
          "Buka sesi tanya-jawab di story, kumpulkan pertanyaan, jawab jadi satu post. Konten yang relevan langsung dari pelanggan.",
      },
      {
        judul: "Perawatan sesuai musim",
        deskripsi:
          "Tips saat musim hujan (jamur kulit) atau musim panas (hidrasi). Konten yang selalu relevan sepanjang tahun.",
      },
      {
        judul: "Hewan yang baru diadopsi pelanggan",
        deskripsi:
          "Follow up hewan yang produk/perlengkapannya beli di tempatmu. Tunjukkan mereka tumbuh sehat \u2014 bukti kualitas tokomu.",
      },
    ],
    contohCaption: [
      {
        judul: "Caption sebelum\u2013sesudah grooming",
        teks:
          "Dari kusut jadi menggemaskan dalam 45 menit. \u2728\n\nGrooming bukan cuma soal tampilan \u2014 bulu bersih bikin hewan lebih sehat dan nyaman. Mau jadwalkan si anabul? Chat kami buat pesan slot minggu ini. \ud83d\udc3e\n\n#petshop #groominghewan #anabul",
      },
      {
        judul: "Caption produk baru",
        teks:
          "Stok makanan baru datang pagi ini \u2014 termasuk varian buat kucing yang susah makan. \ud83d\ude3a\n\nYang anabulnya lagi picky, mampir atau chat dulu buat cek rekomendasi sesuai usianya. Stok terbatas ya!",
      },
      {
        judul: "Caption edukasi",
        teks:
          "\u201cKucing nggak boleh mandi\u201d \u2014 ini mitos yang sering bikin bulu kucing malah bermasalah. \ud83d\udc31\n\nFaktanya: kucing boleh mandi, asal pakai sampo khusus dan tidak terlalu sering. Simpan post ini, dan kalau ragu, bawa ke kami \u2014 dimandikan aman sama groomer.",
      },
      {
        judul: "Caption promo hari sepi",
        teks:
          "Senin\u2013Selasa grooming lagi santai, jadwal masih longgar. \ud83d\ude0c\n\nKhusus dua hari itu ada harga spesial buat mandi + potong kuku. Pas buat yang nggak mau antre. Booking dulu biar kebagian slot.",
      },
      {
        judul: "Caption interaksi",
        teks:
          "Tebak-tebakan sore: kira-kira anabul di foto ini ras apa? \ud83d\udc47\n\nJawab di komentar \u2014 yang paling tepat besok kami kasih tahu jawabannya (dan mungkin ada kejutan kecil buat anabulmu \ud83d\udc40).",
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
