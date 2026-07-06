# Phase 4 - Testing & QA

Phase 4 menambahkan quality gate yang bisa dijalankan ulang sebelum demo, staging, atau production release. Tujuannya memastikan hardening Phase 3 tidak hanya ada di kode, tetapi benar-benar bekerja lewat test otomatis.

## Automated QA

Jalankan:

```bash
npm run qa
```

Command ini menjalankan:

- Syntax check untuk frontend, backend, config, storage, dan QA runner.
- Backend smoke test development mode.
- Backend auth test production token mode.
- Config guard test untuk environment production.
- Static frontend regression check berbasis file.

## Coverage Saat Ini

Automated QA memverifikasi:

- `/health` mengembalikan `200` dan metadata runtime.
- Security header dasar tersedia.
- Halaman utama bisa dirender melalui backend.
- Static allowlist menolak akses ke file backend.
- API simulation lifecycle berjalan: save, load, report, reset.
- Payload invalid ditolak `400`.
- Production token mode menolak request tanpa bearer token `401`.
- Request dengan bearer token valid diterima.
- Production CORS hanya mengizinkan origin eksplisit.
- Config production menolak token pendek dan wildcard CORS.
- Frontend shell punya elemen penting untuk navigation, reset, grading, accessibility, reduced motion, dan bearer token support.

## Manual QA Checklist

Sebelum launch terbatas, lakukan manual pass berikut:

- Desktop 1366px: overview, courtroom, agent profiles, comparative law, grades.
- Mobile 390px: sidebar open/close, backdrop, header, dialogue controls, table horizontal scroll.
- Keyboard: tombol sidebar, tab navigation, reset, next/previous dialogue, form putusan.
- Persistence: refresh browser setelah progress tersimpan, lalu pastikan state kembali.
- Reset: reset simulation menghapus state lokal dan backend.
- Final grading: selesaikan sampai sesi 8 dan pastikan score ring, rubric, dan feedback muncul.
- Offline/fallback: matikan koneksi LLM eksternal dan pastikan dialog fallback tetap berjalan.
- Security smoke: akses `/backend/server.js` harus `403`.

## Batasan

- QA runner belum memakai browser automation penuh seperti Playwright.
- Visual regression belum menangkap screenshot.
- Rate limit belum dites dengan beban tinggi.
- Storage masih file JSON development, sehingga test production database belum relevan.

## Next Step

Phase 5 sebaiknya masuk ke deployment readiness: CI/CD command, release checklist, backup/restore strategy, monitoring hooks, dan environment matrix untuk staging/production.
