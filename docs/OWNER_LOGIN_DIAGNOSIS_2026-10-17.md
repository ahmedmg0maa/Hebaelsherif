# Owner login diagnosis — 2026-10-17

Production source at investigation: `5b48e6f6a75c86d53d0a585277ef60628cf3c5ac`, `prepare-cream-motion`.

## Observed failure

- The real browser submitted the owner form at `/auth/admin` and received the reported generic Arabic rejection.
- Wrangler live tail captured the same POST: request ray `a4bd040ead1de1f4`, HTTP 200, outcome `ok`, no Worker exception. A successful HTTP transport status does not mean successful authentication; the server action returned an application rejection rendered by the form.
- The matching database security event at 2026-10-17 05:48:43 UTC recorded `login_failed`, `credentials_or_auth`. Its subject hash matches the local normalized `OWNER_ADMIN_EMAIL` without exposing the address. The event was written in the intended Supabase project `zfbwpubsnuijybxjuidc`; the same shared URL feeds both Auth and service clients in this deployed source.
- The supplied password was independently submitted to Supabase Auth using the configured public client: HTTP 400, `invalid_credentials`, no authenticated user/session. No password reset was attempted. This is an actual credential test, not `check-admin-login`.
- The configured Auth account exists, is email-confirmed, has a password, is not banned or soft-deleted, is not SSO-only, and has the existing owner role and enabled password enrollment. No administrative sessions were created.
- Cloudflare confirms all required bindings exist. Their secret values are deliberately unreadable through the settings API; email/project matching above is based on the deployed request and database evidence, not a claim that Cloudflare returns plaintext secret values.
- Anonymous `/admin/overview` still redirects to the Admin login page after the rejected attempt.

## Acceptance boundary

The failure occurs at password authentication, before `establishAdminSession`, cookie creation or `owner_password_assured`. There is no evidence yet of a session/cookie defect. Owner role/enrollment readiness must never be reported as proof of password login.

The user elected to enter the current correct password in a local masked field. A temporary Windows DPAPI input is used only for this test; it must be removed afterwards. Until authentication succeeds, owner dashboard reload, logout, session revocation and protection after logout remain unaccepted. Do not change the password, disable MFA for staff, remove throttles or grant broader access to work around the rejected credential.

Private evidence is ignored under `.launch-backups/`: Worker tail, safe direct Auth result and diagnostic state. Do not publish raw HTTP headers, cookies, provider keys, passwords or customer identities.

## Corrected local input transport

Windows PowerShell was inheriting the PowerShell 7 module search path, causing security-module autoload failure at `ConvertFrom-SecureString`. The input script now imports the exact `Microsoft.PowerShell.Security.psd1` under its own `$PSHOME`. It supports the existing hidden console prompt and a `-Dialog` masked field; both write the same Windows current-user DPAPI ciphertext at the same ignored path. A new input request discards stale ciphertext. No plaintext password is written, logged, added to an argument or stored in Git.

The actual Node consumer now uses `scripts/owner-test-secret.mjs`. It imports the producing host's compatible security module, captures decryption in a local anonymous pipe into memory, clears its byte buffer and removes the encrypted input by default. A controlled combined Auth/browser test may retain the encrypted input until both checks finish, then remove it. Child-process exceptions are replaced by a fixed message so captured secret output cannot be logged accidentally. The connected diagnostic runner was switched to this reader.

Executed on Windows: both Windows PowerShell and PowerShell 7 `-SelfTest`; `node scripts/verify-owner-test-input.mjs` tested ciphertext from both hosts through the real Node reader, Unicode/quotes/whitespace preservation, default encrypted-file removal and safe failure on corrupt ciphertext. These tests use generated fixtures and do not consume or change the owner's real input. They prove input compatibility, not owner authentication. Actual current-password entry remains required before repeating the live login acceptance.
