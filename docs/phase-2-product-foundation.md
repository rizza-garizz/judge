# HakimPintar AI Phase 2 Product Foundation

Fase 2 menambahkan pondasi backend awal tanpa dependency eksternal. Tujuannya membuat sistem mulai bergerak dari prototype statis menuju produk yang punya API, persistence server-side, dan struktur laporan.

## Scope Yang Sudah Masuk

- Backend Node.js built-in HTTP di `backend/server.js`.
- Storage development berbasis JSON file di `backend/data/dev-db.json`.
- Static serving untuk frontend dari server yang sama.
- Health check untuk monitoring awal.
- Dev auth endpoint untuk mensimulasikan user login.
- API save/load/reset progres simulasi.
- API laporan nilai current user.
- Frontend tetap local-first dan otomatis fallback ke `localStorage` jika backend mati.

## Cara Menjalankan

```bash
npm run dev
```

Lalu buka:

```text
http://127.0.0.1:4000
```

Health check:

```text
http://127.0.0.1:4000/health
```

## Endpoint Awal

- `GET /health`
- `POST /api/auth/dev-login`
- `GET /api/auth/me`
- `GET /api/simulations/current`
- `PUT /api/simulations/current`
- `DELETE /api/simulations/current`
- `GET /api/reports/current`

Semua endpoint dev memakai header `X-Dev-User-Id`. Jika header tidak dikirim, backend memakai user default `dev-judge`.

## Data Model Development

Storage JSON menyimpan:

- `users`: user dan role awal.
- `simulations`: snapshot progres per user.
- `auditLogs`: event save/reset simulasi.

File data runtime sengaja diabaikan Git melalui `.gitignore`.

## Batasan Fase 2

- Storage JSON belum cocok untuk production multi-user.
- Auth masih dev-mode, belum password/session/JWT sungguhan.
- Belum ada RBAC enforcement untuk admin/penguji/peserta.
- Belum ada database migration formal.
- Belum ada export PDF/CSV.

## Backlog Fase Berikutnya

- Migrasi storage dari JSON ke PostgreSQL atau SQLite dengan migration.
- Tambah login production dan session management.
- Tambah RBAC middleware.
- Tambah admin dashboard dan report export.
- Tambah test API dan E2E flow.
