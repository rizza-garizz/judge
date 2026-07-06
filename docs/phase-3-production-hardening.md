# Phase 3 - Production Hardening

Phase 3 menutup celah dasar sebelum aplikasi masuk jalur deployment yang lebih serius. Fokusnya adalah konfigurasi runtime, proteksi API, hardening respons HTTP, dan batasan akses file statis.

## Perubahan Utama

- Menambahkan konfigurasi backend terpusat di `backend/config.js`.
- Menambahkan validasi environment untuk `PORT`, `API_AUTH_MODE`, `API_TOKEN`, `CORS_ORIGIN`, rate limit, dan ukuran body request.
- Menambahkan security headers dasar:
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `Cross-Origin-Resource-Policy`
- Menambahkan CORS allowlist. Production tidak boleh memakai wildcard origin.
- Menambahkan API auth mode:
  - `dev`: memakai `X-Dev-User-Id` untuk development.
  - `token`: mewajibkan `Authorization: Bearer <API_TOKEN>`.
- Menambahkan rate limiting in-memory per IP dan URL.
- Menambahkan request id di response JSON dan header.
- Menambahkan structured request logging.
- Membatasi static serving ke file frontend yang dibutuhkan saja.
- Menambahkan graceful shutdown untuk `SIGINT` dan `SIGTERM`.
- Menambahkan dukungan token di client API melalui `window.HAKIMPINTAR_API_TOKEN` atau `localStorage.hakimpintar.apiToken`.

## Konfigurasi Development

```bash
npm run dev
```

Default development:

```bash
NODE_ENV=development
API_AUTH_MODE=dev
CORS_ORIGIN=*
```

Mode ini masih nyaman untuk pengembangan lokal dan kompatibel dengan penyimpanan progres berbasis `X-Dev-User-Id`.

## Konfigurasi Production

Minimal environment production:

```bash
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
API_AUTH_MODE=token
API_TOKEN=<token-random-minimal-24-karakter>
CORS_ORIGIN=https://domain-produksi.example
REQUEST_LOGGING=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
MAX_BODY_BYTES=1048576
```

Backend akan gagal start jika:

- `API_AUTH_MODE=token` tetapi `API_TOKEN` kurang dari 24 karakter.
- `NODE_ENV=production` tetapi `CORS_ORIGIN=*`.
- Nilai numerik environment tidak valid.
- `HOST` berisi karakter tidak valid.

## Catatan Risiko Tersisa

- Rate limit masih in-memory, belum cocok untuk multi-instance production. Untuk production skala besar, pindahkan bucket ke Redis atau gateway.
- Token auth masih single shared token. Untuk enterprise penuh, lanjutkan ke user auth, session management, role-based access control, dan audit log per user.
- Storage masih file JSON development. Untuk production, pindahkan ke database transactional dengan backup/restore dan migration.
- Belum ada CI/CD gate untuk security scanning, dependency audit, dan e2e regression.

## Status

Phase 3 menaikkan sistem ke baseline production-hardening, tetapi belum menggantikan kebutuhan enterprise identity, database production, observability terpusat, dan compliance audit.
