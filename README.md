# DMS — Dashboard Management System

Membangun platform dashboard terpusat untuk monitoring **Project Initiatives, Requirement Tracking, Mandays Utilization, Delivery Timeline, dan Resource Capacity** dengan dukungan multi-dashboard terisolasi.

Aplikasi ini menggunakan visual dan alur desain premium terinspirasi dari template **CRMi Dashboard**.

---

## Tech Stack

- **Monorepo Manager**: Turborepo & NPM Workspaces
- **Shared Package**: TypeScript Interfaces (`@dms/shared`)
- **Backend Worker**: Cloudflare Workers (Hono framework) + D1 (SQLite) + R2 (Storage)
- **Frontend App**: Next.js 14 App Router + TailwindCSS + Recharts + SheetJS (`xlsx`)

---

## Project Structure

```
/Users/macbookair/.gemini/antigravity-ide/scratch/dms/
├── package.json               # Monorepo root configuration
├── turbo.json                 # Turborepo task pipeline
├── packages/
│   └── shared/                # Shared types between Worker and Next.js
└── apps/
    ├── worker/                # Hono REST API backend (Cloudflare Workers)
    └── web/                   # Next.js frontend application (Cloudflare Pages)
```

---

## Persiapan Awal (Local Setup)

### 1. Install Dependencies
Pastikan Node.js v18+ sudah terinstall. Dari root direktori monorepo, jalankan:
```bash
npm install
```

### 2. Konfigurasi Backend (Local D1 & R2 Simulator)
Wrangler (Cloudflare CLI) mensimulasikan D1 database dan R2 bucket secara lokal.

1. Inisialisasi database lokal dan terapkan skema migrasi:
   ```bash
   cd apps/worker
   npx wrangler d1 execute DMS_DB --local --file=src/db/schema.sql
   ```
2. Buat password hash admin bawaan menggunakan endpoint seed:
   Jalankan worker terlebih dahulu:
   ```bash
   npx wrangler dev --port 8787
   ```
   Di terminal lain, panggil endpoint seed untuk memperbarui password admin lokal:
   ```bash
   curl -X POST http://localhost:8787/api/auth/seed
   ```
   *Password admin bawaan diset ke:* **`Admin@12345`** *(email: `admin@dms.local`)*.

### 3. Konfigurasi Frontend
Next.js dikonfigurasi untuk memanggil backend worker lokal di `http://localhost:8787` secara default.
Jalankan dev server Next.js:
```bash
cd apps/web
npm run dev
```
Buka browser dan buka `http://localhost:3000`. Login dengan email `admin@dms.local` dan password `Admin@12345`.

---

## Alur Pengembangan & Ekspor Excel

1. **Membuat Dashboard Baru**: Klik "Add Dashboard" di Dashboard Portal, masukkan judul dan deskripsi.
2. **Download Template Spreadsheet**: Klik tombol "Download Excel Template" di halaman **Spreadsheet Import Center**.
3. **Upload data excel**: Drag & drop file Anda ke dalam uploader. Jika terdapat error tipe data (misal status atau format tanggal salah), preview akan menampilkan baris merah berisi rincian kolom yang bermasalah.
4. **Commit Import**: Klik "Commit Import" (hanya aktif jika spreadsheet 100% valid) untuk mengunggah ke database D1.
5. **Cross-Filtering**: Seluruh grafik (donut chart status, horizontal bar platform, timeline, kapasitas resource) dan tabel detail secara instan menyesuaikan filter global yang Anda pilih di atas.
6. **Ekspor Data**: Klik tombol "Export Excel" pada tabel detail untuk mengunduh spreadsheet yang di-filter saat itu juga secara real-time.

---

## Langkah Deployment ke Cloudflare (Production)

### 1. Deploy Database D1
```bash
cd apps/worker
npx wrangler d1 create DMS_DB
```
Salin `database_id` yang dihasilkan dan tempelkan di file `apps/worker/wrangler.toml` bagian `database_id`.

Deploy skema ke database Cloudflare D1 production:
```bash
npx wrangler d1 execute DMS_DB --remote --file=src/db/schema.sql
```

### 2. Buat Bucket R2
```bash
npx wrangler r2 bucket create dms-imports
```

### 3. Deploy Backend Worker
```bash
npx wrangler deploy --env production
```
Catat URL Worker production yang dihasilkan (misal `https://dms-worker.username.workers.dev`).

### 4. Deploy Frontend Next.js (Cloudflare Pages)
Next.js diintegrasikan dengan `@cloudflare/next-on-pages` agar berjalan langsung di edge network.

Set env variable di Cloudflare Pages Dashboard:
- `NEXT_PUBLIC_API_URL`: URL Worker production Anda.

Jalankan build and deploy:
```bash
cd apps/web
npm run pages:build
npx wrangler pages deploy .vercel/output/static
```
Atau hubungkan repositori git monorepo Anda ke dashboard Cloudflare Pages untuk continuous deployment otomatis.
