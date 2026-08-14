// ── Sistem i18n terpusat ──────────────────────────────────────────────
// Semua teks UI ada di DICT ini, dikelompokkan per area. Menambah bahasa
// baru (mis. "ar") cukup: (1) tambahkan ke Lang & LANGS, (2) isi field
// bahasa itu pada entri yang relevan. Kunci yang belum diterjemahkan
// otomatis jatuh ke Bahasa Indonesia (lihat t()), jadi migrasi bisa
// bertahap tanpa ada teks yang "hilang".

export type Lang = "id" | "en";
export const LANGS: Lang[] = ["id", "en"];
export const LANG_LABELS: Record<Lang, string> = { id: "Indonesia", en: "English" };

const STORAGE_KEY = "kevo_lang"; // key internal — jangan diubah (backward-compat)

export function getLang(): Lang {
  // Default BAHASA INDONESIA (pre-launch fokus pasar Indonesia).
  if (typeof window === "undefined") return "id";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return (LANGS as string[]).includes(v ?? "") ? (v as Lang) : "id";
}

/**
 * Bahasa yang SUDAH dipilih user (tersimpan), atau null kalau belum pernah.
 * Dipakai halaman login untuk default ke English hanya jika belum ada pilihan.
 */
export function getStoredLang(): Lang | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return (LANGS as string[]).includes(v ?? "") ? (v as Lang) : null;
}

export function setLang(lang: Lang): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, lang);
    // Cookie supaya server component (mis. halaman Dashboard) juga tahu bahasanya.
    document.cookie = `lang=${lang}; path=/; max-age=31536000; samesite=lax`;
  }
}

/** Untuk server component: baca Lang dari nilai cookie "lang". */
export function langFromCookie(value: string | undefined | null): Lang {
  // Default BAHASA INDONESIA kalau cookie belum ada (pre-launch pasar Indonesia).
  return value === "en" ? "en" : "id";
}

// Entri minimal wajib punya "id"; bahasa lain opsional (fallback ke id).
type Entry = { id: string } & Partial<Record<Lang, string>>;

const DICT: Record<string, Entry> = {
  // ── Navigasi ──
  "nav.dashboard": { id: "Dashboard", en: "Dashboard" },
  "nav.buatKonten": { id: "Buat Konten", en: "Create" },
  "nav.otomatis": { id: "Otomatis", en: "Auto" },
  "nav.editKonten": { id: "Edit Konten", en: "Edit" },
  "nav.jadwal": { id: "Jadwal", en: "Schedule" },
  "nav.video": { id: "Video", en: "Video" },
  "nav.admin": { id: "Admin", en: "Admin" },
  "nav.panduan": { id: "Panduan", en: "Guide" },
  "nav.keluar": { id: "Keluar", en: "Log out" },
  "nav.gambar": { id: "Upload Produk", en: "Upload Produk" },
  "buat.tab.otomatis": { id: "Otomatis", en: "Auto" },
  "buat.tab.manual": { id: "Manual", en: "Manual" },
  "gambar.continue": { id: "Lanjut Buat Konten →", en: "Continue to Create →" },
  "dash.img.goto": { id: "Kelola & upload gambar di menu Gambar", en: "Manage & upload images in the Images menu" },

  // ── Pemilih bahasa ──
  "lang.title": { id: "Bahasa", en: "Language" },
  "lang.desc": {
    id: "Bahasa hasil generate (judul & caption). Indonesia atau English.",
    en: "Language of generated content (title & caption). Indonesian or English.",
  },

  // ── Halaman Login ──
  "login.title": { id: "Masuk", en: "Sign in" },
  "login.tagline": { id: "Setiap Produk Punya Cerita", en: "Every Product Has a Story" },
  "login.email": { id: "Email", en: "Email" },
  "login.emailPlaceholder": { id: "kamu@email.com", en: "you@email.com" },
  "login.password": { id: "Password", en: "Password" },
  "login.forgot": { id: "Lupa password?", en: "Forgot password?" },
  "login.error": { id: "Email atau password salah. Coba lagi.", en: "Wrong email or password. Please try again." },
  "login.processing": { id: "Memproses...", en: "Signing in..." },
  "login.submit": { id: "Masuk", en: "Sign in" },
  "login.noAccount": { id: "Belum punya akun?", en: "Don't have an account?" },
  "login.signup": { id: "Daftar", en: "Sign up" },

  // ── Panduan (onboarding) ──
  "panduan.badge": { id: "Panduan Mulai", en: "Getting Started" },
  "panduan.step": { id: "Langkah", en: "Step" },
  "panduan.of": { id: "dari", en: "of" },
  "panduan.skip": { id: "Lewati", en: "Skip" },
  "panduan.back": { id: "Kembali", en: "Back" },
  "panduan.next": { id: "Lanjut", en: "Next" },
  "panduan.done": { id: "Selesai", en: "Done" },
  "panduan.close": { id: "Tutup", en: "Close" },

  "panduan.s1.title": { id: "Upload Logo", en: "Upload Your Logo" },
  "panduan.s1.desc": {
    id: "Mulai di Dashboard: unggah logo usahamu. Logo ini otomatis muncul di setiap konten. Kalau punya, sediakan versi terang & gelap biar pas di background apa pun.",
    en: "Start on the Dashboard: upload your business logo. It shows up automatically on every post. If you have them, add a light and a dark version so it fits any background.",
  },
  "panduan.s1.btn": { id: "Buka Dashboard", en: "Open Dashboard" },

  "panduan.s2.title": { id: "Atur Sosial Media", en: "Add Your Socials" },
  "panduan.s2.desc": {
    id: "Masih di Dashboard: isi akun sosmedmu (Instagram, WhatsApp, YouTube — maksimal 3). Ini yang tampil di baris bawah setiap konten.",
    en: "Still on the Dashboard: add your social accounts (Instagram, WhatsApp, YouTube — up to 3). These appear in the footer of every post.",
  },
  "panduan.s2.btn": { id: "Buka Dashboard", en: "Open Dashboard" },

  "panduan.s3.title": { id: "Upload Jenis Produk", en: "Upload Products" },
  "panduan.s3.desc": {
    id: "Di Dashboard: unggah foto produk lalu pilih kategorinya (Produk, Makanan/Minuman, Skincare, Wajah/Orang, Suasana) dan perlakuannya — tampilkan apa adanya atau olah AI. Foto & kategori inilah bahan kontenmu.",
    en: "On the Dashboard: upload product photos, then pick a category (Product, Food/Drink, Skincare, Face/Person, Scene) and how to use it — as-is or AI-enhanced. These photos and categories are the raw material for your content.",
  },
  "panduan.s3.btn": { id: "Buka Dashboard", en: "Open Dashboard" },

  "panduan.s4.title": { id: "Buat Konten Manual", en: "Create Manually" },
  "panduan.s4.desc": {
    id: "Pilih template & foto, tulis teksmu sendiri, atur posisi teks/logo/sosmed. Cocok kalau mau kontrol penuh atas hasilnya.",
    en: "Pick a template and photo, write your own text, and position the text, logo, and socials. Best when you want full control.",
  },
  "panduan.s4.btn": { id: "Buka Buat Konten", en: "Open Create" },

  "panduan.s5.title": { id: "Buat Konten Otomatis", en: "Auto-Create" },
  "panduan.s5.desc": {
    id: "AI membuatkan gambar + caption otomatis dari data usahamu. Pilih jenis (Produk / Umum / Interaksi) dan ukuran (Feed / Kotak / Story), klik Generate.",
    en: "AI builds the image and caption automatically from your business data. Pick a type (Product / General / Interaction) and size (Feed / Square / Story), then hit Generate.",
  },
  "panduan.s5.btn": { id: "Buka Otomatis", en: "Open Auto" },

  "panduan.s6.title": { id: "Edit Konten", en: "Edit Content" },
  "panduan.s6.desc": {
    id: "Semua kontenmu tersimpan di sini. Buka lagi untuk mengubah teks, menggeser logo/sosmed, atau menyimpan ulang sebagai PNG.",
    en: "All your content is saved here. Reopen it to change text, move the logo or socials, or re-save as a PNG.",
  },
  "panduan.s6.btn": { id: "Buka Edit Konten", en: "Open Edit" },

  "panduan.s7.title": { id: "Jadwal", en: "Schedule" },
  "panduan.s7.desc": {
    id: "Atur kapan tiap konten mau diposting dan lihat kalendernya — biar posting rutin tanpa lupa.",
    en: "Plan when each post goes out and see it on a calendar — so you post consistently without forgetting.",
  },
  "panduan.s7.btn": { id: "Buka Jadwal", en: "Open Schedule" },

  // ── Dashboard: Logo ──
  "dash.logo.section": { id: "Logo Bisnis", en: "Business Logo" },
  "dash.logo.desc": {
    id: "Upload dua versi logo: satu untuk latar terang, satu untuk latar gelap.",
    en: "Upload two versions of your logo: one for light backgrounds, one for dark.",
  },
  "dash.logo.dark": { id: "Logo Gelap", en: "Dark Logo" },
  "dash.logo.darkHint": { id: "Untuk latar TERANG (background putih/cerah)", en: "For LIGHT backgrounds (white/bright)" },
  "dash.logo.light": { id: "Logo Terang", en: "Light Logo" },
  "dash.logo.lightHint": { id: "Untuk latar GELAP (background hitam/gelap)", en: "For DARK backgrounds (black/dark)" },
  "dash.logo.position": { id: "Posisi di konten", en: "Position on content" },
  "dash.logo.posTL": { id: "Kiri atas", en: "Top left" },
  "dash.logo.posTR": { id: "Kanan atas", en: "Top right" },
  "dash.logo.posBL": { id: "Kiri bawah", en: "Bottom left" },
  "dash.logo.posBR": { id: "Kanan bawah", en: "Bottom right" },
  "dash.logo.choose": { id: "Pilih", en: "Choose" },
  "dash.logo.chooseLogo": { id: "Pilih Logo", en: "Choose Logo" },
  "dash.logo.replace": { id: "Ganti Logo", en: "Replace Logo" },
  "dash.logo.uploadPrefix": { id: "Upload", en: "Upload" },
  "dash.logo.uploading": { id: "Mengupload...", en: "Uploading..." },
  "dash.logo.delete": { id: "Hapus Logo", en: "Delete Logo" },
  "dash.logo.deleting": { id: "Menghapus...", en: "Deleting..." },
  "dash.logo.none": { id: "Belum ada logo", en: "No logo yet" },
  "dash.logo.loadErr": { id: "Gagal memuat logo.", en: "Failed to load logo." },
  "dash.logo.uploadErr": { id: "Gagal mengunggah logo.", en: "Failed to upload logo." },
  "dash.logo.deleteErr": { id: "Gagal menghapus logo.", en: "Failed to delete logo." },
  "dash.logo.posErr": { id: "Gagal update posisi.", en: "Failed to update position." },
  "dash.logo.removeBg": { id: "Hapus Background", en: "Remove Background" },
  "dash.logo.removingBg": { id: "Menghapus background…", en: "Removing background…" },
  "dash.logo.removeBgErr": { id: "Gagal menghapus background.", en: "Failed to remove background." },
  "dash.logo.removeBgHint": { id: "Untuk logo dengan latar warna solid (mis. putih polos).", en: "For logos with a solid-color background (e.g. plain white)." },

  // ── Dashboard: umum ──
  "dash.greeting": { id: "Halo,", en: "Hi," },
  "dash.fallbackName": { id: "Bisnismu", en: "there" },
  "dash.subtitle": {
    id: "Atur aset bisnismu di sini. Untuk bikin konten, buka menu di atas.",
    en: "Manage your business assets here. To create content, use the menu above.",
  },
  "dash.sec.social": { id: "Sosial Media", en: "Social Media" },
  "dash.sec.assets": { id: "Data & Aset Bisnis", en: "Business Data & Assets" },

  // ── Dashboard: Database Gambar ──
  "dash.img.title": { id: "Database Gambar", en: "Image Library" },
  "dash.img.desc": { id: "Unggah gambar bisnis (lproduk, suasana, dll) untuk dipakai nanti saat generate konten.", en: "Upload your business images (logo, products, scenes, etc.) to use later when generating content." },
  "dash.img.choose": { id: "Pilih Gambar", en: "Choose Image" },
  "dash.img.chooseAria": { id: "Pilih file gambar", en: "Choose an image file" },
  "dash.img.description": { id: "Deskripsi", en: "Description" },
  "dash.img.phSkincare": { id: "mis. serum wajah untuk kulit kering — dipakai pagi & malam, kandungan vitamin C", en: "e.g. face serum for dry skin — used morning & night, with vitamin C" },
  "dash.img.phFood": { id: "mis. es kopi susu gula aren, dingin & segar / ayam geprek sambal matah, pedas", en: "e.g. iced palm-sugar milk coffee, cold & fresh / smashed fried chicken, spicy" },
  "dash.img.phDefault": { id: "mis. Logo klinik warna biru, dipakai di semua konten", en: "e.g. Blue clinic logo, used on all content" },
  "dash.img.device": { id: "Tampilan perangkat", en: "Device view" },
  "dash.img.deviceHint": { id: "AI menyesuaikan adegan software dengan layar yang dipilih.", en: "AI matches the software scene to the selected screen." },
  "dash.img.deviceDesktop": { id: "Desktop / Laptop", en: "Desktop / Laptop" },
  "dash.img.roomSize": { id: "Estimasi ukuran ruangan", en: "Estimated room size" },
  "dash.img.productSize": { id: "Estimasi ukuran produk", en: "Estimated product size" },
  "dash.img.optional": { id: "(opsional)", en: "(optional)" },
  "dash.img.phRoom": { id: "mis. ruang tamu ± 4x5 m / kantor kecil", en: "e.g. living room ± 4x5 m / small office" },
  "dash.img.phProduct": { id: "mis. tinggi 1,8 m (vending machine) / botol 250 ml", en: "e.g. 1.8 m tall (vending machine) / 250 ml bottle" },
  "dash.img.hintRoom": { id: "Membantu AI menjaga proporsi ruangan tetap realistis.", en: "Helps AI keep room proportions realistic." },
  "dash.img.hintProduct": { id: "Membantu AI menjaga skala produk (mis. produk besar tidak dikecilkan).", en: "Helps AI keep product scale right (e.g. large products aren't shrunk)." },
  "dash.img.category": { id: "Kategori", en: "Category" },
  "dash.img.categoryTipTitle": { id: "Kategori gambar", en: "Image category" },
  "dash.img.categoryTipText": { id: "Mengelompokkan gambar sesuai fungsinya: Logo, Produk, Suasana, dll. Saat generate konten, sistem memilih gambar dari kategori yang sesuai.", en: "Groups images by function: Logo, Product, Scene, etc. When generating, the system picks images from the matching category." },
  "dash.img.handling": { id: "Perlakuan gambar", en: "Image handling" },
  "dash.img.asIsB": { id: "Apa adanya", en: "As-is" },
  "dash.img.asIsDesc": { id: "— gambar dipakai persis seperti aslinya (mis. logo). AI tidak mengubahnya.", en: "— the image is used exactly as-is (e.g. a logo). AI doesn't change it." },
  "dash.img.aiB": { id: "Boleh diolah AI", en: "AI-enhanced" },
  "dash.img.aiDesc": { id: "— AI boleh memotong background / membuat suasana baru dari foto ini.", en: "— AI may remove the background or build a new scene from this photo." },
  "dash.img.asIs": { id: "Apa adanya (dipakai langsung)", en: "As-is (used directly)" },
  "dash.img.aiOk": { id: "Boleh diolah AI", en: "AI-enhanced" },
  "dash.img.uploading": { id: "Mengunggah…", en: "Uploading…" },
  "dash.img.upload": { id: "Unggah Gambar", en: "Upload Image" },
  "dash.img.noDesc": { id: "(tanpa deskripsi)", en: "(no description)" },
  "dash.img.deleting": { id: "Menghapus…", en: "Deleting…" },
  "dash.img.delete": { id: "Hapus", en: "Delete" },
  "dash.img.errList": { id: "Gagal memuat daftar gambar.", en: "Failed to load images." },
  "dash.img.errUpload": { id: "Gagal mengunggah gambar.", en: "Failed to upload image." },
  "dash.img.errDelete": { id: "Gagal menghapus gambar.", en: "Failed to delete image." },
  "dash.img.errNoFile": { id: "Pilih file gambar dulu.", en: "Choose an image file first." },

  // ── Dashboard: Sosial Media ──
  "dash.social.descA": { id: "Isi akun sosial mediamu, lalu centang maksimal", en: "Add your social accounts, then check up to" },
  "dash.social.descB": { id: "yang ingin tampil di konten.", en: "to show on your content." },
  "dash.social.errLoad": { id: "Gagal memuat data sosial media.", en: "Failed to load social media." },
  "dash.social.errSave": { id: "Gagal menyimpan.", en: "Failed to save." },
  "dash.social.showTitle": { id: "Tampilkan di konten", en: "Show on content" },
  "dash.social.fillFirst": { id: "Isi akunnya dulu", en: "Fill in the account first" },
  "dash.social.show": { id: "Tampil", en: "Show" },
  "dash.social.saving": { id: "Menyimpan…", en: "Saving…" },
  "dash.social.save": { id: "Simpan Sosial Media", en: "Save Social Media" },
  "dash.social.saved": { id: "Tersimpan ✓", en: "Saved ✓" },

  // ── Dashboard: Token & Refill ──
  "token.title": { id: "Token AI", en: "AI Tokens" },
  "token.desc": {
    id: "Dipakai tiap pakai fitur AI (potong 1 per aksi).",
    en: "Used with each AI feature (1 per action).",
  },
  "token.unlimited": { id: "Unlimited", en: "Unlimited" },
  "token.unlimitedFull": { id: "Tak terbatas", en: "Unlimited" },
  "token.out": { id: "Habis", en: "Out" },
  "token.loading": { id: "Memuat...", en: "Loading..." },
  "token.tokensLeft": { id: "token tersisa", en: "tokens left" },
  "token.outMsg": {
    id: "Token habis — fitur AI (generate & potong background) tidak bisa dipakai sampai diisi ulang.",
    en: "Out of tokens — AI features (generate & background removal) are paused until refilled.",
  },
  "token.aiFeaturesInfo": {
    id: "Fitur AI: potong background, Generate AI, Generate Otomatis, Generate caption.",
    en: "AI features: background removal, Generate AI, Auto Generate, caption generator.",
  },
  "token.betaRefill": {
    id: "Selama masa uji coba: +1 token gratis per hari (maks 5). Top-up akan aktif dalam beberapa minggu.",
    en: "During beta: +1 free token per day (up to 5). Paid top-up coming in a few weeks.",
  },
  "token.refilledJustNow": {
    id: "Kamu dapat +1 token gratis hari ini.",
    en: "You got +1 free token today.",
  },
};

/** Ambil teks terjemahan. Fallback: bahasa diminta -> Indonesia -> kunci mentah. */
export function t(key: string, lang: Lang): string {
  const entry = DICT[key];
  if (!entry) return key;
  return entry[lang] ?? entry.id ?? key;
}
