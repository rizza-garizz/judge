# Phase 5 - Deployment Readiness

Phase 5 menyiapkan jalur staging/production yang bisa diulang, diaudit, dan dipulihkan. Fokusnya bukan menambah fitur, tetapi memastikan release memiliki prosedur operasional yang jelas.

## Release Gate

Sebelum deploy:

```bash
npm run qa
```

Setelah deploy ke staging atau production:

```bash
SMOKE_BASE_URL=https://domain-produksi.example \
SMOKE_API_TOKEN=<production-api-token> \
SMOKE_EXPECTED_CORS_ORIGIN=https://domain-produksi.example \
npm run smoke:production
```

Jika environment masih memakai `API_AUTH_MODE=dev`, `SMOKE_API_TOKEN` boleh dikosongkan. Untuk production, token wajib dipakai.

## Environment Matrix

| Environment | NODE_ENV | API_AUTH_MODE | HOST | CORS_ORIGIN | Storage | Tujuan |
| --- | --- | --- | --- | --- | --- | --- |
| Local | development | dev | 127.0.0.1 | * | JSON dev file | Pengembangan cepat |
| Staging | production | token | 0.0.0.0 | domain staging eksplisit | JSON sementara / managed volume | UAT dan smoke test |
| Production | production | token | 0.0.0.0 | domain production eksplisit | managed volume / database | Penggunaan terbatas |

## Required Production Environment

```bash
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
DATA_DIR=/var/lib/hakimpintar
API_AUTH_MODE=token
API_TOKEN=<random-secret-minimal-24-karakter>
CORS_ORIGIN=https://domain-produksi.example
REQUEST_LOGGING=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
MAX_BODY_BYTES=1048576
AUDIT_RETENTION_DAYS=365
```

## Pre-Deploy Checklist

- `npm run qa` pass di branch yang akan dideploy.
- `API_TOKEN` sudah dibuat sebagai secret, bukan ditulis di repo.
- `CORS_ORIGIN` hanya berisi domain staging/production yang valid.
- Runtime Node.js minimal versi 18.
- Port service sesuai target platform.
- Health endpoint dapat diakses dari load balancer atau uptime checker.
- Lokasi storage `backend/data` punya permission tulis jika masih memakai JSON storage.
- Jika memakai volume production, set `DATA_DIR` ke path volume yang persist.
- Backup folder `backend/data` tersedia sebelum deploy baru.
- `npm run data:doctor` pass sebelum deploy.

## Deploy Procedure

1. Pull commit release yang sudah lolos QA.
2. Set production environment variables.
3. Start service dengan:

   ```bash
   npm start
   ```

4. Pastikan log startup berisi `Environment=production API_AUTH_MODE=token`.
5. Jalankan production smoke test.
6. Jalankan `npm run data:doctor`.
7. Catat commit hash, waktu deploy, environment, dan hasil smoke test.

## Post-Deploy Verification

- `/health` mengembalikan `200` dan `environment=production`.
- `/` mengembalikan HTML dan menampilkan `HakimPintar AI`.
- `/backend/server.js` mengembalikan `403`.
- `/api/simulations/current` tanpa token mengembalikan `401`.
- `/api/simulations/current` dengan bearer token valid mengembalikan `200`.
- Header `x-request-id`, `x-frame-options`, dan `x-content-type-options` muncul.
- Log request berbentuk JSON dan memuat `requestId`, `method`, `path`, `status`, dan `durationMs`.
- `npm run data:doctor` mengembalikan `ok=true`.

## Rollback Procedure

1. Hentikan service versi baru.
2. Checkout commit terakhir yang sudah diketahui stabil.
3. Restore backup `backend/data` jika schema/data rusak.
4. Jalankan service dengan environment yang sama.
5. Jalankan `npm run smoke:production`.
6. Catat alasan rollback dan commit yang dipulihkan.

## Backup & Restore

Saat masih memakai JSON storage development:

- Backup sebelum deploy:

  ```bash
  cp backend/data/dev-db.json backend/data/dev-db.json.backup-YYYYMMDD-HHMMSS
  ```

- Restore:

  ```bash
  cp backend/data/dev-db.json.backup-YYYYMMDD-HHMMSS backend/data/dev-db.json
  ```

Untuk enterprise production penuh, migrasikan storage ke database transactional dengan backup otomatis, retention policy, dan restore drill berkala.

## Monitoring

Minimum production monitoring:

- Uptime check ke `/health`.
- Error-rate alert untuk status `5xx`.
- Alert untuk lonjakan `401`, `403`, dan `429`.
- Log retention minimal 14 hari untuk audit terbatas.
- Audit retention aplikasi dikontrol lewat `AUDIT_RETENTION_DAYS`.
- Disk usage alert untuk lokasi `backend/data`.
- Deploy log berisi commit hash dan hasil smoke test.

## CI/CD Baseline

Workflow GitHub Actions tersedia di `.github/workflows/qa.yml` dan menjalankan:

```bash
npm run qa
```

Workflow aktif untuk push ke `main`, push ke `launch-hardening`, dan pull request ke `main`.

## Known Gaps

- Belum ada image/container production resmi.
- Belum ada database production dan migration framework.
- Belum ada centralized logging provider.
- Belum ada browser e2e visual regression.
- Belum ada secret rotation automation.

## Exit Criteria Phase 5

- CI QA gate tersedia.
- Production smoke command tersedia.
- Environment matrix terdokumentasi.
- Pre-deploy, post-deploy, rollback, backup, dan monitoring runbook tersedia.
- README mengarahkan operator ke dokumen deployment.
