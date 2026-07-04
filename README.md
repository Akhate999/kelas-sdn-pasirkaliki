# Aplikasi Manajemen Kelas — SDN Pasirkaliki 1

## PANDUAN DEPLOY (Ikuti urutan ini saat menggunakan laptop)

### LANGKAH 1 — Buat file .env.local
Di dalam folder aplikasi ini, buat file baru bernama `.env.local` (persis dengan titiknya)
dan isi dengan:

```
NEXT_PUBLIC_SUPABASE_URL=https://ahqcoaijjxgluzwgnyiq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFocWNvYWlqanhnbHV6d2dueWlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNjA4MDksImV4cCI6MjA5ODYzNjgwOX0.SYt6ZzuDW3xPmJJLym_xMNj9juJyfSa3yxFf-BQh0FE
```

### LANGKAH 2 — Upload ke GitHub
1. Login ke github.com
2. Klik tombol "+" → "New repository"
3. Nama repo: `kelas-sdn-pasirkaliki` → klik "Create repository"
4. Upload semua file ini ke repository tersebut

### LANGKAH 3 — Deploy ke Vercel
1. Login ke vercel.com (gunakan akun GitHub)
2. Klik "Add New Project"
3. Pilih repository `kelas-sdn-pasirkaliki`
4. Di bagian "Environment Variables", tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL` = (URL Supabase kamu)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (anon key kamu)
5. Klik "Deploy"
6. Tunggu selesai → kamu akan dapat link aplikasi

### LANGKAH 4 — Buat storage bucket di Supabase
Untuk modul ajar bisa diupload, buat storage:
1. Di Supabase → klik "Storage" di menu kiri
2. Klik "New bucket"
3. Nama bucket: `modul-ajar`
4. Centang "Public bucket"
5. Klik "Save"

### LANGKAH 5 — Buat akun pertama (Admin/Wali Kelas)
1. Di Supabase → Authentication → Users → "Invite user"
2. Masukkan email kamu → kirim
3. Cek email → klik link untuk set password
4. Setelah masuk ke aplikasi, update role di Supabase:
   - Table Editor → profiles → cari akun kamu → ubah role dari 'murid' ke 'wali_kelas'

### LANGKAH 6 — Buat kelas
Di Supabase → Table Editor → kelas → Insert row:
- nama: "Kelas 4A" (sesuaikan)
- tingkat: 4
- tahun_ajaran: "2025/2026"
- wali_kelas_id: (ID akun kamu dari tabel profiles)

---
Setelah semua langkah selesai, aplikasi siap digunakan!
Hubungi pengembang jika ada kendala.
