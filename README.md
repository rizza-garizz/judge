# HakimPintar AI - Simulator Peradilan Pidana Multi-Agent ⚖️

HakimPintar AI adalah sebuah aplikasi web interaktif yang mensimulasikan ruang persidangan pidana di Indonesia dengan menggunakan arsitektur *Multi-Agent AI*. Aplikasi ini dirancang sebagai *sandbox* interaktif untuk melatih calon hakim atau praktisi hukum dalam mengambil keputusan strategis di persidangan.

Simulasi ini difokuskan pada penerapan **KUHP Baru (UU No. 1/2023)** dan **KUHAP Baru (2025)** terkait kasus pencurian dengan pemberatan, lengkap dengan interaksi AI yang berperan sebagai Jaksa Penuntut Umum, Penasihat Hukum, Terdakwa, dan Saksi Ahli Digital Forensik.

## ✨ Fitur Utama

- **Interaksi Multi-Agent AI**: Setiap agen (JPU, Penasihat Hukum, Terdakwa, Saksi) dilengkapi dengan *Profile*, *Memory*, *Strategy*, dan modul *Legal RAG* yang membuat percakapan sidang terasa nyata dan dinamis.
- **Workflow Persidangan (8 Sesi)**: Terdiri dari tahap Pembacaan Dakwaan, Eksepsi, Pemeriksaan Saksi, Validasi CCTV & GPS, hingga Amar Putusan.
- **Validasi Bukti Forensik Interaktif**: Terdapat modul sandbox untuk melakukan *AI Enhancement* (Deblur & Super Res) pada barang bukti CCTV dan verifikasi koordinat *GPS/BTS* melalui *timeline map*.
- **Asisten AI ARIA**: Analisis fakta sidang secara real-time yang menyarankan pertimbangan hukum yang komprehensif untuk Hakim Ketua.
- **Penilaian Otomatis (Grading System)**: Menghitung skor keadilan, kepatuhan KUHAP, ketepatan penerapan pasal KUHP 2023, dan evaluasi bukti digital di akhir simulasi.
- **Komparasi Hukum**: Modul untuk membandingkan aturan di KUHP/KUHAP lama dan baru secara langsung.

## 🛠️ Teknologi yang Digunakan

Aplikasi ini berjalan sepenuhnya di sisi klien (Client-Side) dan menggunakan pendekatan *vanilla* modern tanpa *build tools* yang berat:
- **HTML5 & Vanilla CSS**: Desain UI premium menggunakan Glassmorphism, Micro-animations, CSS Variables, dan layout responsif.
- **Vanilla JavaScript**: Menangani state management, logika agen, validasi, navigasi tab, dan *grading system*.
- **Lucide Icons**: Koleksi ikon SVG yang ringan dan modern.
- **Leaflet.js**: Integrasi peta interaktif untuk simulasi pelacakan koordinat GPS Terdakwa.
- **Pollinations Text API**: Layanan inferensi LLM gratis yang digunakan untuk membalas prompt agen AI secara dinamis tanpa API key.

## 🚀 Cara Menjalankan Aplikasi

Aplikasi ini dapat dijalankan langsung di browser mana pun tanpa instalasi tambahan.

## 🧭 Launch Readiness

Catatan audit Fase 0 dan hardening Fase 1 tersedia di [`docs/phase-0-1-launch-readiness.md`](docs/phase-0-1-launch-readiness.md). Versi saat ini sudah menambahkan persistence lokal, reset simulasi, timeout fallback AI, dan rendering dialog yang lebih aman, namun masih membutuhkan backend, validasi ahli hukum, audit keamanan, dan testing end-to-end sebelum dipakai sebagai produk enterprise.

Pondasi produk Fase 2 tersedia di [`docs/phase-2-product-foundation.md`](docs/phase-2-product-foundation.md). Backend development dapat dijalankan dengan:

```bash
npm run dev
```

Buka `http://127.0.0.1:4000` untuk menjalankan frontend melalui backend dan menyimpan progres ke storage development.

### Opsi 1: Menjalankan Langsung (Local)
1. *Clone* repositori ini:
   ```bash
   git clone https://github.com/rizza-garizz/judge.git
   ```
2. Buka folder proyek.
3. Klik ganda pada file `index.html` untuk membukanya di browser favorit Anda.

### Opsi 2: Menggunakan Local Development Server
Untuk mencegah kendala CORS pada browser saat memuat script, disarankan menggunakan *local server*:
```bash
# Menggunakan Node.js / npx
npx serve . -p 3000

# Atau menggunakan Python
python -m http.server 3000
```
Buka `http://localhost:3000` di browser.

## ⚖️ Skenario Kasus (Perkara Aktif)

- **Terdakwa**: Adi Saputra
- **Kasus Posisi**: Terdakwa didakwa mengambil tas berisi uang operasional sebesar Rp 15 juta dari sebuah minimarket di kawasan Sudirman, dengan cara merusak laci kasir menggunakan obeng pada pukul 23:15 WIB. Terdakwa memiliki alibi bahwa ia sedang tertidur di kosnya di kawasan Menteng.
- **Dakwaan Utama**: Pencurian dengan pemberatan (Pasal 477 ayat (1) KUHP Baru 2023).

---
*Dikembangkan untuk eksperimen integrasi AI pada ranah pendidikan hukum.*
