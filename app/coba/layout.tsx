/**
 * Layout khusus untuk /coba (halaman iklan).
 *
 * Sengaja POLOS: tidak me-render Header global, SupportWidget, atau elemen
 * akun apa pun. Halaman iklan harus bertujuan tunggal — tidak ada tautan
 * yang menarik pengunjung keluar dari corong "coba -> daftar".
 *
 * Ini yang menghilangkan "bulatan N" di pojok: elemen itu berasal dari
 * layout utama; dengan layout sendiri di segmen /coba, ia tidak ikut ter-render.
 */
export default function CobaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
