# Ekosistem Digital Jumbara PMR

Aplikasi pengelolaan Jumbara PMR PMI Kabupaten Purbalingga.

## Teknologi
- Frontend: HTML, CSS, JavaScript tanpa proses build
- Autentikasi, database, dan realtime: Supabase
- Hosting statis: GitHub Pages
- Supabase JS: 2.119.0 (CDN, versi dipatok)

## Jenjang
- MU — PMR Mula
- MA — PMR Madya
- WI — PMR Wira

## Fondasi yang sudah tersedia
- Dashboard responsif untuk desktop dan ponsel.
- Halaman login dan pendaftaran akun dengan email/kata sandi.
- Koneksi frontend ke Supabase menggunakan publishable key.
- Tabel profil, peran, relasi pengguna-peran, edisi Jumbara, dan jenjang.
- RLS aktif pada seluruh tabel fondasi; akses publik belum dibuka.

## Status
Ini adalah fondasi aplikasi, belum aplikasi operasional lengkap. Akun yang mendaftar belum otomatis memperoleh peran. Penetapan Admin Markas pertama harus dilakukan secara terkontrol sebelum pengelolaan kegiatan diaktifkan.

## Rencana implementasi
1. Penetapan Admin Markas pertama dan verifikasi login.
2. Modul kegiatan, jenjang, master wilayah, dan sekolah.
3. Pendaftaran kontingen dan pengelolaan peserta.
4. Pos/lomba, rubrik, penugasan juri, dan input nilai.
5. Rekap, papan skor publik/TV, PDF, dan arsip.

## Keamanan
- Publishable key boleh digunakan pada frontend; jangan pernah menyimpan service-role/secret key di repository atau browser.
- RLS wajib tetap aktif pada tabel di schema yang terekspos.
- Berikan akses Data API secara eksplisit dan sesuai kebutuhan; RLS tetap menjadi pengendali akses baris.
- Pendaftaran akun tidak memberikan kewenangan admin secara otomatis.
