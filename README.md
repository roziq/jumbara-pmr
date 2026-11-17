# Ekosistem Digital Jumbara PMR

Aplikasi pengelolaan Jumbara PMR PMI Kabupaten Purbalingga.

## Teknologi
- Frontend: HTML, CSS, JavaScript tanpa proses build
- Database dan autentikasi: Supabase
- Hosting statis: GitHub Pages

## Jenjang
- MU — PMR Mula
- MA — PMR Madya
- WI — PMR Wira

## Status saat ini
Repositori berisi fondasi antarmuka dashboard responsif. Kartu ringkasan dan navigasi masih tampilan awal; modul operasional, autentikasi, dan koneksi database belum diaktifkan.

## Rencana implementasi
1. Konfigurasi Supabase dan keamanan Row Level Security (RLS).
2. Autentikasi dan pembagian hak akses.
3. Data edisi Jumbara, jenjang, pos/lomba, dan konfigurasi penilaian.
4. Pendaftaran kontingen dan pengelolaan peserta.
5. Penugasan juri, pemindaian QR, dan input nilai.
6. Rekap, papan skor publik/TV, PDF, dan arsip.

## Keamanan
- Jangan menyimpan service_role key di frontend atau repositori.
- Frontend hanya boleh menggunakan publishable/anon key dengan RLS aktif.
- Batasi seluruh operasi data berdasarkan peran dan kepemilikan.