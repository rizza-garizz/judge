# Phase 8 - RBAC & Identity Foundation

Phase 8 menambahkan role-based access control dasar untuk memisahkan akses peserta, penguji, auditor, dan admin. Tujuannya membuat endpoint sensitif tidak hanya terlindungi token, tetapi juga dibatasi berdasarkan fungsi pengguna.

## Roles

| Role | Tujuan |
| --- | --- |
| `peserta` | Menjalankan simulasi dan melihat report sendiri. |
| `penguji` | Menjalankan simulasi dan membaca report. |
| `auditor` | Membaca report, audit log, dan compliance export. |
| `admin` | Akses penuh termasuk storage integrity. |

## Permission Matrix

| Permission | admin | auditor | penguji | peserta |
| --- | --- | --- | --- | --- |
| `simulation:write` | yes | no | yes | yes |
| `report:read` | yes | yes | yes | yes |
| `audit:read` | yes | yes | no | no |
| `compliance:export` | yes | yes | no | no |
| `storage:admin` | yes | no | no | no |
| `user:manage` | yes | no | no | no |

## Identity Headers

Development mode:

```http
X-Dev-User-Id: dev-judge
X-Dev-User-Role: admin
```

Token mode:

```http
Authorization: Bearer <API_TOKEN>
X-User-Id: user-123
X-User-Role: auditor
```

Catatan: token mode saat ini masih memakai trusted headers setelah bearer token valid. Untuk enterprise production penuh, headers ini harus diganti token claims dari identity provider.

## Protected Endpoints

| Endpoint | Required Permission |
| --- | --- |
| `PUT /api/simulations/current` | `simulation:write` |
| `DELETE /api/simulations/current` | `simulation:write` |
| `GET /api/reports/current` | `report:read` |
| `GET /api/audit/current` | `audit:read` |
| `GET /api/compliance/export/current` | `compliance:export` |
| `GET /api/admin/storage/integrity` | `storage:admin` |

`GET /api/auth/me` mengembalikan actor aktif, role, permissions, dan permission matrix.

## Audit

Access denied dicatat sebagai:

```text
access.denied
```

Metadata audit mencakup role, permission yang dibutuhkan, path, dan request id.

## QA Coverage

`npm run qa` memverifikasi:

- peserta bisa save simulation dan melihat report,
- peserta ditolak saat membaca audit log,
- admin bisa membaca audit log dan storage integrity,
- auditor bisa menjalankan compliance export,
- `access.denied` tercatat di audit log,
- `/api/auth/me` mengembalikan actor permissions.

## Known Gaps

- Token mode belum memakai JWT/session claims.
- Belum ada password login atau SSO.
- Belum ada user management endpoint untuk admin.
- Belum ada tenant/org boundary.
- Belum ada policy engine eksternal.

## Next Step

Phase 9 sebaiknya masuk ke identity provider integration plan: JWT validation, session expiry, token rotation, user provisioning, dan tenant boundary.
