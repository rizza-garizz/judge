# Phase 7 - Production Data Platform

Phase 7 memperkuat lapisan data agar storage development saat ini punya jalur operasional yang lebih aman: path storage bisa dikonfigurasi, database JSON memiliki schema metadata, integrity check tersedia, dan backup/restore dapat dijalankan dengan command yang bisa diaudit.

## Perubahan Utama

- `DATA_DIR` bisa dikonfigurasi lewat environment.
- File data memiliki `metadata.schemaVersion`.
- `/health` menampilkan ringkasan storage tanpa membuka data sensitif.
- Endpoint integrity:

  ```http
  GET /api/admin/storage/integrity
  ```

- CLI data platform:

  ```bash
  npm run data:doctor
  npm run data:backup -- release-2026-07-07
  npm run data:restore -- backend/data/dev-db.backup-YYYYMMDD.json
  ```

- QA otomatis memakai data directory temporary agar test tidak mencampuri data development.
- Production smoke memverifikasi storage schema version.

## Environment

```bash
DATA_DIR=backend/data
```

Untuk production dengan volume terpisah:

```bash
DATA_DIR=/var/lib/hakimpintar
```

Pastikan user proses Node.js memiliki permission baca/tulis ke folder tersebut.

## Data Doctor

Jalankan sebelum dan sesudah deploy:

```bash
npm run data:doctor
```

Command ini memeriksa:

- schema version,
- user id duplikat,
- role user valid,
- simulation memiliki id, userId, dan snapshot,
- audit log memiliki id, userId, action, dan timestamp valid.

Exit code `1` berarti integrity check gagal.

## Backup

Backup manual:

```bash
npm run data:backup -- before-release
```

Output berisi lokasi file backup, ukuran file, dan schema version.

## Restore

Restore akan otomatis membuat backup pre-restore jika database aktif sudah ada:

```bash
npm run data:restore -- backend/data/dev-db.backup-2026-07-07.json
```

Setelah restore, jalankan:

```bash
npm run data:doctor
npm run smoke:production
```

## Production Database Path

Storage JSON masih cocok untuk demo, staging ringan, dan launch terbatas. Untuk enterprise production penuh, target berikutnya adalah database transactional.

Rekomendasi migrasi:

- PostgreSQL untuk relational data dan audit query.
- Migration table untuk schema version.
- Append-only audit table.
- Automated daily backup.
- Restore drill minimal bulanan.
- RBAC untuk admin, auditor, penguji, dan peserta.
- Encryption at rest dari provider infrastructure.

## Exit Criteria Phase 7

- Data path configurable.
- Storage memiliki schema metadata.
- Integrity endpoint tersedia.
- Backup/restore command tersedia.
- QA gate memverifikasi data platform.
- Dokumentasi migrasi production database tersedia.
