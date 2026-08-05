# Threat Model: Prescription / Regulated Business Flow

Scope: the pharmacist pilot only — `prescription_requests`, the `prescriptions`
storage bucket, `seller_credentials`, and the two edge functions
`submit-prescription` and `prescription-signed-url`. Everything outside that
boundary (music, orchards, payments, chat generally) is out of scope for this
document.

Status: analysis only. No code has been changed as part of this deliverable.

---

## 1. Assets

| Asset | Classification | Where it lives |
|---|---|---|
| Prescription image / PDF | Special-category health data | `prescriptions` bucket (private) |
| Symptoms and notes (`client_notes`) | Special-category health data | `prescription_requests.client_notes` **and** `chat_messages.content` |
| Delivery address | Personal data | `prescription_requests.delivery_address` |
| Contact phone | Personal data | `prescription_requests.contact_phone` |
| Linkage of patient identity to a pharmacy | Personal data (inference risk) | `prescription_requests.user_id` + `sower_id` |
| Pharmacist licence documents | Regulated credential | `seller_credentials` + credential bucket |
| Consult chat transcript | Health data | `chat_messages` for the consult room |
| Service-role key | Full-bypass credential | Edge function environment |

The classification matters: under POPIA s26/s32 and GDPR Art. 9, health data is
special-category. It requires an explicit lawful basis, data minimisation, and
demonstrable access control — not merely "it's private-ish".

## 2. Trust boundaries

```text
 Browser (untrusted)
   |  (1) direct upload -> prescriptions bucket        <-- boundary A
   |  (2) invoke submit-prescription (user JWT)        <-- boundary B
   v
 Edge function (trusted, holds service-role key)
   |  (3) service-role writes, RLS bypassed            <-- boundary C
   v
 Postgres + Storage
```

- **Boundary A** is the weakest link: the browser writes to object storage
  *before* any server-side authorization decision has been made.
- **Boundary B** is where the only real authentication happens (`getUser()`
  against the Auth server — correct, not a decoded-JWT shortcut).
- **Boundary C** is where all RLS protection is deliberately switched off. Every
  guarantee past this point depends on the function's own logic being correct.

## 3. Attack surface

1. `POST /functions/v1/submit-prescription` — authenticated, no rate limit.
2. `POST /functions/v1/prescription-signed-url` — authenticated, no rate limit.
3. Direct `storage.objects` INSERT into the `prescriptions` bucket from the SPA.
4. `prescription_requests` direct PostgREST reads/writes under RLS.
5. The consult chat room and its `chat_messages`.
6. `/prescriptions/:sowerId` and the inbox route in the SPA.

## 4. STRIDE analysis

### Spoofing
- **Current control:** both functions call `userClient.auth.getUser()`, which
  re-validates the token against the Auth server rather than trusting a decoded
  JWT. Self-submission is blocked (`sower.user_id === user.id`).
- **Gap:** no MFA on privileged accounts. An admin or GoSat credential stuffed
  from a breach elsewhere yields full read of every consult.
- **Gap:** no account lockout or per-identity throttle on the submit endpoint.

### Tampering
- **Current control:** `prescription_requests` RLS scopes SELECT to the owning
  client and the addressed sower; the row is created service-side, so status
  cannot be set arbitrarily at creation.
- **Gap (HIGH):** `prescription_file_path` is accepted verbatim from the client
  and stored without checking that the caller actually owns that object. See
  finding F-1 below.
- **Gap:** no optimistic locking on status transitions. Two concurrent updates
  (patient cancels, pharmacist fulfils) can silently clobber each other.

### Repudiation
- **Gap (HIGH):** there is no audit trail at all. Nothing records who downloaded
  a prescription, when a status changed, or which pharmacist opened which
  patient's file. A pharmacist can deny having viewed a record and there is no
  evidence either way. POPIA and HIPAA-aligned practice both expect an access
  log for health records.

### Information disclosure
- **Current control:** the bucket is private; reads go through
  `prescription-signed-url`, which checks that the caller is either the
  requesting patient or the addressed pharmacist, and issues a 300-second URL.
  That ownership check is correct.
- **Gap (HIGH):** F-1 below defeats that check upstream.
- **Gap (MEDIUM):** `client_notes` — symptom text — is copied verbatim into
  `chat_messages.content`. It is now protected by chat RLS rather than
  prescription RLS, and is exposed to anyone who can be added to that room, to
  moderation tooling, and to any future chat export. Health data should not be
  duplicated into a general-purpose messaging table.
- **Gap (MEDIUM):** health data, addresses, and phone numbers are stored in
  plaintext columns. Any read path defect, backup leak, or over-broad support
  query exposes them directly.
- **Gap (LOW):** the catch block returns the raw exception message to the
  client (`{ error: msg }`), which can leak column names, constraint names, and
  Postgres error codes.
- **Note:** signed URLs, once issued, are bearer tokens for 5 minutes. Anything
  that captures browser history or a referrer within that window can replay
  them. 300s is a reasonable tradeoff but is not zero-risk.

### Denial of service
- **Gap:** no rate limit on either function. An authenticated account can
  create unbounded consult rooms, prescription rows, and notifications, and can
  fill the `prescriptions` bucket with arbitrary large files. There is also no
  file size cap enforced server-side.

### Elevation of privilege
- **Current control:** RBAC uses a separate `user_roles` table with a
  `SECURITY DEFINER has_role()` — correct pattern, no role column on profiles.
- **Gap:** the role set has no clinical roles. `doctor`, `pharmacy`, `clinic`,
  `patient`, `auditor`, and `support` do not exist; "is this user a pharmacist"
  is inferred from `sowers.seller_template = 'regulated_business'`, which is a
  commerce attribute, not an authorization role. There is no auditor role, so
  the compliance function cannot be granted read-only access without handing
  over full admin.

## 5. Findings

| ID | Severity | Finding |
|---|---|---|
| F-1 | **High** | Unvalidated `prescription_file_path`. The client uploads to storage first, then passes the object path to `submit-prescription`, which stores it with no check that the caller owns it. An attacker who learns or guesses another patient's object path can submit a throwaway request carrying that path, then call `prescription-signed-url` on their *own* request id — the ownership check passes, and they receive a signed URL to someone else's prescription. This is a classic IDOR that bypasses an otherwise correct authorization check. |
| F-2 | **High** | No audit log. No record of prescription views, downloads, status changes, or credential decisions. |
| F-3 | **Medium** | Upload path is `{sower_id}/...`, keyed to the *recipient*, not the uploader. This conflicts with the recently tightened folder-ownership storage policy (which expects an `auth.uid()` prefix) and makes per-patient retention or deletion impractical. Also permits writing into another sower's folder namespace. |
| F-4 | **Medium** | No server-side file validation: MIME type, magic bytes, extension, and size are only constrained by an HTML `accept` attribute, which is trivially bypassed. No malware scanning. |
| F-5 | **Medium** | Symptom text duplicated into `chat_messages`, widening the blast radius of health data beyond prescription RLS. |
| F-6 | **Medium** | Health data, addresses, and phone numbers stored in plaintext at rest. |
| F-7 | **Medium** | No rate limiting on either prescription endpoint; no lockout on repeated failures. |
| F-8 | **Low** | Raw exception messages returned to the client. |
| F-9 | **Low** | Orphaned uploads: if `submit-prescription` fails after the upload succeeds, the file remains in the bucket forever, unreferenced and never subject to retention. |
| F-10 | **Low** | No optimistic locking on status transitions. |

## 6. Recommended remediation order

1. **F-1** — make the edge function own the whole upload, or verify the object's
   owner before accepting the path. This is the only finding with a direct,
   practical path to reading another patient's health record.
2. **F-3 / F-4 / F-9** — fold upload into the authorized backend call: validate
   magic bytes and size, reject executables, write under a server-chosen key.
3. **F-2** — append-only audit table, INSERT revoked from `authenticated` and
   `anon`, written only by `SECURITY DEFINER` functions, covering view,
   download, status change, and credential decisions.
4. **F-7** — per-user and per-IP counters checked inside the edge functions.
   Noted explicitly: this backend has no standard rate-limiting primitive, so
   this will be an ad-hoc implementation with the accuracy and latency costs
   that implies. You have approved that tradeoff.
5. **MFA** for `admin` and `gosat` roles (TOTP enrolment, enforced at the
   privileged routes and re-verified server-side).
6. **F-5 / F-6** — stop duplicating symptom text into chat; envelope-encrypt
   the remaining sensitive columns.
7. **F-8 / F-10** — generic error responses with a correlation id; version
   column on status updates.

## 7. Explicitly not implemented, and why

- **Argon2id password hashing** — Supabase GoTrue owns credential storage and
  does not expose the hash algorithm. Implementing a parallel password store
  would be strictly less secure than the managed one. Documented, not built.
- **TLS, secure cookies, refresh-token rotation, session expiry, DDoS/WAF,
  encrypted backups, non-superuser DB accounts** — all provided by
  Supabase/Cloudflare. No action required or possible from application code.
- **Antivirus scanning** — requires an external scanning service. Cannot be
  delivered without one being provisioned.
- **Intrusion detection, penetration testing** — operational activities, not
  code deliverables.
- **CSRF tokens** — the API is token-authenticated with no ambient cookie
  credentials, so CSRF does not apply to these endpoints. Adding tokens would
  be cargo-cult.

## 8. Residual risk after full remediation

- A compromised pharmacist account still sees every prescription addressed to
  that pharmacy. Mitigated by audit logging and MFA, not eliminated.
- The service-role key remains a total-compromise credential. Its blast radius
  is bounded only by the correctness of the edge function code.
- Signed URLs remain replayable within their 300-second lifetime.
- Encryption at rest protects against backup and read-path leakage, not against
  a compromised backend that legitimately holds the key.
- No formal Data Processing Agreement or breach-notification runbook exists;
  both are POPIA/GDPR obligations that live outside the codebase.
