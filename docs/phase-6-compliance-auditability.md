# Phase 6 - Compliance & Auditability

Phase 6 menambahkan kontrol audit dasar agar aktivitas penting bisa ditelusuri dan diekspor. Ini adalah fondasi awal untuk kebutuhan operasional enterprise seperti evidence collection, audit review, dan incident investigation.

## Kontrol yang Ditambahkan

- Audit log untuk event penting:
  - `auth.dev-login`
  - `simulation.save`
  - `simulation.reset`
  - `report.view`
  - `compliance.export`
- Endpoint audit user aktif:

  ```http
  GET /api/audit/current?limit=100
  ```

- Endpoint compliance export user aktif:

  ```http
  GET /api/compliance/export/current
  ```

- Retention audit berbasis environment:

  ```bash
  AUDIT_RETENTION_DAYS=365
  ```

- QA otomatis diperluas untuk memastikan audit log dan compliance export tersedia.

## Compliance Export Content

Compliance export berisi:

- Metadata waktu export.
- Profil user aktif.
- Snapshot simulation aktif.
- Report evaluasi.
- Audit logs user aktif.
- Retention policy aktif.

Contoh smoke manual:

```bash
curl -H "Authorization: Bearer <token>" \
  https://domain-produksi.example/api/compliance/export/current
```

## Data Retention

Saat backend start, audit log yang lebih tua dari `AUDIT_RETENTION_DAYS` akan dipangkas. Default saat ini adalah 365 hari.

Catatan:

- Retention berlaku pada storage JSON development.
- Untuk production database, retention harus dipindahkan menjadi scheduled job atau lifecycle policy database.
- Sebelum memperpendek retention, pastikan kebutuhan hukum, kebijakan internal, dan kebutuhan audit sudah disetujui.

## Review Checklist

- Audit log muncul setelah save/reset simulation.
- Report view tercatat saat endpoint report dibuka.
- Compliance export mencakup simulation, report, dan audit logs.
- Token mode tetap melindungi endpoint `/api/audit/current` dan `/api/compliance/export/current`.
- Retention period terdokumentasi di environment production.

## Known Gaps

- Audit log belum immutable secara kriptografis.
- Belum ada role-based access control granular untuk admin/auditor.
- Belum ada audit log signing atau append-only storage.
- Belum ada data subject request workflow.
- Belum ada privacy notice dan legal basis formal.
- Storage JSON masih cocok untuk staging/demo, bukan enterprise production penuh.

## Next Step

Phase 7 sebaiknya masuk ke production data platform: database transactional, migration strategy, backup automation, restore drill, dan role-based access control.
