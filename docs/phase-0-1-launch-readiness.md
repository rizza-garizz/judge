# HakimPintar AI Phase 0-1 Launch Readiness

Dokumen ini mencatat hasil audit awal dan hardening tahap pertama sebelum sistem dinaikkan ke fondasi produk enterprise.

## Phase 0 - Audit Awal

### Status Sistem Saat Ini

- Aplikasi berjalan sebagai web statis berbasis `index.html`, `style.css`, `data.js`, dan `app.js`.
- Data skenario, profil agen, komparasi hukum, dan rubrik nilai masih disimpan di sisi klien.
- Interaksi AI bersifat hybrid: alur sidang scripted, lalu respons non-hakim dapat diparafrasekan melalui Pollinations Text API.
- Belum ada backend, autentikasi, database, audit log, atau admin dashboard.

### Risiko Prioritas

- Input hakim dan respons AI tidak boleh dirender sebagai HTML mentah karena berisiko XSS.
- Progres simulasi hilang saat refresh jika tidak ada persistence lokal atau backend.
- CDN dan layanan AI eksternal menjadi dependency runtime.
- Klaim "multi-agent AI + RAG" masih perlu dibedakan dari implementasi saat ini yang belum memiliki RAG/backend orchestration nyata.
- Konten hukum, nomor pasal, dan rubrik harus divalidasi ahli hukum sebelum dipakai sebagai materi resmi.

### Batasan Rilis Fase 1

- Fase 1 tidak mengubah arsitektur menjadi backend.
- Fase 1 hanya menyiapkan hardening frontend, state lokal, dan dokumentasi risiko.
- Sistem tetap harus diberi disclaimer sebagai simulasi edukatif, bukan nasihat hukum.

## Phase 1 - Hardening Prototype

### Perubahan Yang Disiapkan

- Sanitasi rendering dialog dan toast dengan `textContent` untuk mencegah HTML injection dari input hakim atau output AI.
- Persistence progres penting melalui `localStorage`.
- Tombol reset simulasi untuk kebutuhan demo, UAT, dan pelatihan.
- Timeout pemanggilan AI agar UI tidak terlalu lama menunggu layanan eksternal.
- Perbaikan inkonsistensi komentar Pasal 477 pada logic scoring.

### Acceptance Criteria

- User dapat refresh browser tanpa kehilangan sesi aktif, putusan sela, validasi CCTV/GPS, dan nilai akhir.
- User dapat mengosongkan progres dengan tombol Reset.
- Input seperti `<script>alert(1)</script>` tampil sebagai teks biasa di bubble dialog.
- Jika layanan AI lambat/gagal, sistem kembali memakai dialog scripted.
- Komentar dan label scoring selaras pada Pasal 477 untuk pencurian dengan pemberatan.

## Backlog Menuju Phase 2

- Backend API untuk auth, session persistence, transcript, score report, dan audit log.
- Database schema untuk user, role, simulation run, decision, transcript, rubric, dan report.
- Role-based access control: admin, dosen/penguji, peserta.
- Export laporan nilai PDF/CSV.
- Content management untuk skenario perkara dan rubrik.
- Legal review workflow sebelum skenario dipublikasikan.
- RAG dan multi-agent orchestration di backend jika klaim AI enterprise dipertahankan.
