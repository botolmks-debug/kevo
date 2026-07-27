/**
 * Satu nilai business_id tetap dipakai di seluruh app selama belum ada auth
 * (mode trial, satu workspace dev — lihat spec-08). Saat auth+RLS beneran
 * dipasang nanti, ini diganti business_id dari sesi user yang login.
 */
export const DEV_BUSINESS_ID = "00000000-0000-0000-0000-000000000001";
