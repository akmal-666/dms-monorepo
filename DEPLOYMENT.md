# Panduan Deploy DMS Monorepo ke Cloudflare

DMS (Dashboard Management System) menggunakan arsitektur monorepo dengan teknologi berikut:
- **Frontend**: Next.js (pada `apps/web`) yang berjalan di **Cloudflare Pages**.
- **Backend**: Hono API (pada `apps/worker`) yang berjalan di **Cloudflare Workers**.
- **Database**: **Cloudflare D1** (SQLite serverless).
- **Penyimpanan Berkas**: **Cloudflare R2** (Object Storage).

Berikut adalah langkah-langkah detail untuk mendeploy aplikasi ini ke akun Cloudflare Anda.

---

## 🛠️ Prasyarat
Sebelum memulai, pastikan Anda telah menginstal dan terbiasa dengan:
1. Akun Cloudflare yang aktif.
2. [Node.js](https://nodejs.org/) versi 18 atau lebih baru.
3. Login ke Cloudflare CLI (Wrangler) pada mesin lokal Anda:
   ```bash
   npx wrangler login
   ```

---

## 1. Konfigurasi & Inisialisasi Database (Cloudflare D1)

Cloudflare D1 akan digunakan sebagai database utama aplikasi.

### Langkah A: Membuat Database Baru
Jalankan perintah berikut untuk membuat database D1 di Cloudflare:
```bash
npx wrangler d1 create DMS_DB
```

Anda akan menerima output seperti ini:
```text
✅ Successfully created database 'DMS_DB'

[[d1_databases]]
binding = "DB"
database_name = "DMS_DB"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### Langkah B: Perbarui `wrangler.toml`
Buka file `apps/worker/wrangler.toml` dan perbarui `database_id` di bawah bagian `[[d1_databases]]` dengan ID database baru yang Anda peroleh di atas:

```toml
[[d1_databases]]
binding = "DB"
database_name = "DMS_DB"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # Masukkan database_id Anda di sini
```

### Langkah C: Jalankan Migrasi Skema ke Cloudflare
Jalankan migrasi database remote ke Cloudflare D1 agar struktur tabel terbuat:
```bash
# Masuk ke folder worker
cd apps/worker

# Jalankan skema database ke production (remote)
npx wrangler d1 execute DMS_DB --remote --file=src/db/schema.sql
```

### Langkah D: Seed Password Admin
Secara default, skema D1 membuat pengguna `admin@dms.local` dengan password placeholder yang tidak aman. Jalankan perintah SQL berikut untuk mengganti password admin menjadi `Admin@12345` menggunakan hash yang valid:

```bash
npx wrangler d1 execute DMS_DB --remote --command="UPDATE users SET password_hash = 'sha256:static1234567890:d89af011c86f482a59863e5777292650e8a9608ec10e3367cbbcf4b56c6116bb' WHERE email = 'admin@dms.local';"
```

> ⚠️ **Penting**: Disarankan untuk segera mengganti password admin setelah login pertama demi alasan keamanan.

---

## 2. Pembuatan Storage Bucket (Cloudflare R2)

Aplikasi DMS membutuhkan R2 bucket untuk menaruh berkas impor Excel.

Buat bucket baru bernama `dms-imports` (atau nama lain yang disesuaikan pada `wrangler.toml` bagian `bucket_name`):
```bash
npx wrangler r2 bucket create dms-imports
```

---

## 3. Deploy Backend (Cloudflare Workers)

### Langkah A: Deploy Kode API
Masuk ke direktori `apps/worker` dan deploy kodenya:
```bash
cd apps/worker
npx wrangler deploy
```

Setelah selesai, Cloudflare akan memberikan URL publik untuk API Worker Anda, misalnya:
`https://dms-worker.username.workers.dev`

Catat URL ini karena akan digunakan sebagai backend API untuk frontend Next.js.

### Langkah B: Konfigurasi Environment Variables di Cloudflare
Anda perlu mendefinisikan variable rahasia (secrets) untuk backend produksi Anda:

1. **JWT Secret**: Kunci enkripsi untuk session token:
   ```bash
   npx wrangler secret put JWT_SECRET
   ```
   *Masukkan string acak yang panjang dan aman.*

2. **CORS Origin**: URL dari frontend Cloudflare Pages Anda (misal: `https://dms.pages.dev` atau alamat dashboard domain Anda):
   ```bash
   npx wrangler secret put CORS_ORIGIN
   ```
   *Jika belum mengetahui domain frontend, Anda dapat mengisi `*` terlebih dahulu atau memperbaruinya nanti setelah frontend selesai di-deploy.*

---

## 4. Deploy Frontend (Cloudflare Pages)

Next.js dapat dideploy ke Cloudflare Pages menggunakan build generator `@cloudflare/next-on-pages`.

### Metode A: Menghubungkan Git Repository ke Cloudflare Dashboard (Sangat Direkomendasikan)
1. Buka [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Pergi ke menu **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
3. Hubungkan akun GitHub Anda dan pilih repository `dms-monorepo`.
4. Konfigurasikan pengaturan build sebagai berikut:
   - **Framework preset**: `None` (atau pilih `Next.js` jika tersedia)
   - **Build command**: `npx @cloudflare/next-on-pages`
   - **Build output directory**: `apps/web/.vercel/output/static`
   - **Root directory**: `apps/web`
5. Buka bagian **Variables and Secrets** di pengaturan build Pages, lalu tambahkan environment variable:
   - `NEXT_PUBLIC_API_URL`: *[Masukkan URL Cloudflare Worker yang telah di-deploy di Langkah 3, misal: `https://dms-worker.username.workers.dev`]*
6. Buka **Settings** -> **Functions** -> **Compatibility flags** di Pages Dashboard Anda:
   - Di bagian **Production** dan **Preview**, tambahkan compatibility flag: `nodejs_compat`. (Ini wajib agar modul Node.js kompatibel dengan Cloudflare Pages).
7. Klik **Save and Deploy**. Cloudflare Pages akan membuild dan mendeploy aplikasi secara otomatis setiap kali ada push ke branch `main`.

### Metode B: Deploy Manual Menggunakan CLI
Jika Anda ingin mendeploy langsung dari mesin lokal tanpa integrasi Git:

1. Pastikan Anda berada di root monorepo.
2. Jalankan build Next.js lokal khusus Pages:
   ```bash
   cd apps/web
   npx @cloudflare/next-on-pages
   ```
3. Deploy folder output statis menggunakan Wrangler:
   ```bash
   npx wrangler pages deploy .vercel/output/static --project-name=dms-web
   ```
4. Tambahkan environment variable `NEXT_PUBLIC_API_URL` dan set compatibility flag `nodejs_compat` di panel web Cloudflare Pages.

---

## 🔄 Pemeliharaan & Troubleshooting

### CORS Error / Gagal Login di Frontend
Jika setelah dideploy Anda tidak bisa login atau muncul error CORS:
1. Pastikan nilai `CORS_ORIGIN` di Worker API Anda sama persis dengan URL frontend Cloudflare Pages (tanpa trailing slash `/`). Contoh: `https://dms-web.pages.dev`.
2. Jika Anda mengubah CORS_ORIGIN, jalankan kembali perintah setting secret atau perbarui di Dashboard Cloudflare Workers bagian Settings -> Variables.

### Log & Pemantauan Live
Untuk melihat log realtime dari Worker API Anda di production:
```bash
cd apps/worker
npx wrangler tail
```
