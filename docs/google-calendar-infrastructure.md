# DOKUMENTASI INFRASTRUKTUR GOOGLE CLOUD & GOOGLE CALENDAR API
## Platform KKN SPACE · Posko Desa Pringgasela Selatan
**Target Integrasi**: Modul Agenda Kegiatan & Shared Calendar Posko KKN  
**Status**: Persiapan Infrastruktur (Fase 1–5 Selesai)  
**Dokumen Referensi**: `docs/google-calendar-infrastructure.md`  

---

## 1. Ikhtisar & Arsitektur Integrasi

Integrasi Google Calendar pada platform **KKN SPACE** dirancang untuk menghubungkan jadwal program kerja, agenda rapat koordinasi, survei lapangan, dan jadwal piket posko ke dalam kalender digital yang dapat disinkronkan langsung ke perangkat smartphone seluruh anggota tim dan DPL.

Arsitektur terdiri dari dua lapisan:
1. **Application Backend Layer (KKN SPACE Web App)**: Menggunakan OAuth 2.0 Web Application credentials dan Supabase Vault untuk pertukaran token dan sinkronisasi kalender bersama posko.
2. **AI Agent Tooling Layer (Antigravity Assistant)**: Menggunakan plugin resmi Google Calendar dari Agent Marketplace untuk memungkinkan asisten Antigravity membaca jadwal agenda posko secara aman.

> [!IMPORTANT]
> Seluruh kredensial rahasia (*Client Secret*, *Refresh Tokens*, *Service Account Keys*) **DILARANG KERAS** disimpan di frontend, file `.env` publik, maupun di-commit ke repositori GitHub. Kredensial rahasia hanya akan dimasukkan ke dalam Supabase Vault / Edge Function Secrets setelah mendapatkan persetujuan pengguna.

---

## 2. Status Audit Lingkungan Awal (Environment Audit)

| Komponen Audit | Hasil Pemeriksaan | Status | Tindakan Lanjutan |
|:---|:---|:---:|:---|
| **Google Cloud CLI (`gcloud`)** | Tidak terpasang pada terminal lokal host Windows | **NOT READY** | Pengaturan Cloud Console dilakukan via Web Console browser atau instalasi manual CLI jika diperlukan |
| **Autentikasi Akun Google** | Terautentikasi di Antigravity sebagai `abhyy333@gmail.com` (via plugin gdrive) | **READY** | Akun siap digunakan sebagai Project Owner & Developer Contact |
| **Application Default Credentials (ADC)** | File `application_default_credentials.json` belum ada di host | **NOT READY** | Tidak wajib untuk arsitektur OAuth Web Application KKN SPACE |
| **Google Cloud Project** | Belum terhubung project khusus KKN SPACE via CLI | **ACTION REQUIRED** | Memerlukan pemilihan project existing atau pembuatan project baru di Google Cloud Console |
| **Google Calendar API** | Belum diaktifkan pada project KKN SPACE | **ACTION REQUIRED** | Diaktifkan via Google Cloud Console: `calendar-json.googleapis.com` |
| **OAuth Consent Screen** | Belum dikonfigurasi untuk KKN SPACE | **ACTION REQUIRED** | Konfigurasi tipe *External* dengan status *Testing* |
| **OAuth 2.0 Client ID** | Belum dibuat untuk KKN SPACE Web Client | **ACTION REQUIRED** | Dibuat tipe *Web application* dengan Authorized Redirect URI terdaftar |
| **Antigravity Calendar MCP** | Plugin resmi tersedia di Marketplace (`antigravity-plugins-official/plugin/gcalendar`) | **AVAILABLE** | Pengguna dapat menambahkan via card plugin di Antigravity |

---

## 3. Spesifikasi Google Cloud Project

- **Nama Project yang Disarankan**: `kkn-space-production` (atau `kknspace-pringgasela`)
- **Project ID**: Dihasilkan unik oleh Google Cloud (contoh: `kkn-space-xxxxxx`)
- **Kebijakan Billing**:
  - Google Calendar API menyediakan kuota gratis sebesar **1.000.000 queries per hari**, yang lebih dari cukup untuk kebutuhan seluruh posko KKN tanpa biaya sepeser pun.
  - Tidak diperlukan aktivasi layanan berbayar (paid services) untuk integrasi kalender standar.

---

## 4. Konfigurasi OAuth 2.0 Consent Screen

Langkah konfigurasi pada menu **APIs & Services → OAuth consent screen**:

1. **User Type**: Pilih **External**  
   *(Diperlukan agar akun Google anggota KKN dan DPL dari berbagai domain, seperti `@gmail.com` dan `@unram.ac.id`, dapat mengotorisasi).*
2. **App Information**:
   - **App name**: `KKN SPACE`
   - **User support email**: `abhyy333@gmail.com`
   - **App logo**: *(Opsional, logo resmi KKN SPACE)*
3. **App Domain**:
   - **Application home page**: `https://kknspace.vercel.app`
   - **Application privacy policy link**: `https://kknspace.vercel.app`
   - **Application terms of service link**: `https://kknspace.vercel.app`
   - **Authorized domains**: `kknspace.vercel.app`, `supabase.co`
4. **Developer Contact Information**: `abhyy333@gmail.com`
5. **Scopes**:
   - `https://www.googleapis.com/auth/calendar.events` *(Melihat dan mengelola acara kalender agenda posko)*
   - `https://www.googleapis.com/auth/calendar.readonly` *(Membaca metadata kalender)*
   - `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`
6. **Test Users (Publishing status: Testing)**:
   - Tambahkan email anggota KKN yang bertindak sebagai penguji:
     - `abhyy333@gmail.com` (Super Admin)
     - Akun pengurus/sekretaris posko yang mengelola agenda

---

## 5. Spesifikasi OAuth 2.0 Client ID (Web Application)

Pada menu **APIs & Services → Credentials → Create Credentials → OAuth client ID**:

- **Application type**: `Web application`
- **Name**: `KKN SPACE Web Client`
- **Authorized JavaScript origins**:
  - Production: `https://kknspace.vercel.app`
  - Local Dev: `http://localhost:5173`
  - Local Dev IP: `http://127.0.0.1:5173`
- **Authorized redirect URIs**:
  - Supabase Auth Callback: `https://aofwlbvxsczcpqgwtanb.supabase.co/auth/v1/callback`
  - Vercel App Callback: `https://kknspace.vercel.app/api/auth/callback/google`
  - Local Dev Callback: `http://localhost:5173/auth/callback/google`
  - Local Dev IP Callback: `http://127.0.0.1:5173/auth/callback/google`

---

## 6. Tata Kelola Kredensial & Supabase Secrets

### A. Environment Variables Frontend (`.env` / Vercel Environment)
Nilai-nilai ini bersifat publik dan aman diletakkan di frontend:
```bash
# Google OAuth Client ID (Aman untuk frontend)
VITE_GOOGLE_CLIENT_ID="[CLIENT_ID_DARI_GOOGLE_CONSOLE].apps.googleusercontent.com"

# Shared Calendar ID Posko KKN (Publik bagi anggota)
VITE_GOOGLE_CALENDAR_ID="[CALENDAR_ID]@group.calendar.google.com"
```

### B. Supabase Edge Functions / Backend Secrets (Strictly Private)
Dikelola di Supabase Dashboard (`Project Settings → Edge Functions → Secrets`) atau via Supabase CLI. **JANGAN PERNAH DILETAKKAN DI KODE FRONTEND:**
```bash
# OAuth Client Secret (HANYA DI BACKEND SUPABASE)
GOOGLE_CLIENT_SECRET="[SECRET_DARI_GOOGLE_CONSOLE]"

# Redirect URI terdaftar
GOOGLE_REDIRECT_URI="https://kknspace.vercel.app/api/auth/callback/google"
```

---

## 7. Langkah Menghubungkan Shared Calendar Posko

1. **Pembuatan Kalender Bersama Posko**:
   - Buka Google Calendar ([calendar.google.com](https://calendar.google.com)) menggunakan akun posko / ketua (`abhyy333@gmail.com`).
   - Buat kalender baru: *"Agenda KKN Pringgasela Selatan 2026/2027"*.
   - Salin **Calendar ID** dari menu *Settings and sharing → Integrate calendar* (contoh format: `c_xxxxxxxxx@group.calendar.google.com`).
2. **Pengaturan Hak Akses (Permissions)**:
   - Bagikan akses ke email sekretaris dan koordinator divisi dengan hak *Make changes to events*.
   - Set akses umum anggota: *See all event details*.
3. **Penyimpanan ID ke KKN SPACE**:
   - Calendar ID didaftarkan ke sistem KKN SPACE sehingga modul Agenda dapat membaca dan menyinkronkan jadwal kegiatan posko secara real-time.

---

## 8. Hal-hal yang Membutuhkan Persetujuan Pengguna

Sebelum melanjutkan ke implementasi kode backend dan modul kalender, persetujuan berikut diperlukan:
1. **Persetujuan Pemilihan / Pembuatan Google Cloud Project**:
   - Konfirmasi apakah ingin menggunakan project Google Cloud yang sudah ada di akun `abhyy333@gmail.com` atau membuat project baru bernama `kkn-space-production`.
2. **Persetujuan Pemasukan Kredensial ke Supabase Vault**:
   - Memasukkan `GOOGLE_CLIENT_SECRET` ke dalam secret Supabase secara privat tanpa commit ke Git.
3. **Instalasi Plugin Google Calendar di Antigravity**:
   - Menambahkan plugin Google Calendar dari Marketplace Card untuk kebutuhan asisten Antigravity.
