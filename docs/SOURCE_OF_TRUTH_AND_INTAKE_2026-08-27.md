# Source of truth and intake — 2026-08-27

## Adopted baseline

- The active source is the Git working tree at `D:/claude` on `codex/master-merge-2026-08-27`.
- The branch starts from remote commit `57820ab`, preserving the owner’s newer `CNAME` commit. No force push, reset, merge to `main`, or public push was performed.
- The requested archive name `hebaelsherif(2).zip` was not present. `D:/0000/hebaelsherif.zip` was accepted as the renamed primary only after all 413 tracked source files matched local commit `5b3441f` byte-for-byte with no missing or changed source file.
- The archive itself is not extracted into the repository because it also contains environment files, Supabase temporary metadata, generated build output, test artifacts, and a log. Those entries are evidence of unsafe packaging, not source to import.
- The two comparison archives are reference-only and are not source-of-truth inputs.

## Intake safety result

| Input | Role | Result |
|---|---|---|
| `hebaelsherif.zip` | renamed primary evidence | source matched; unsafe generated/private entries excluded |
| `Hebaelsherif-2.zip` | comparison only | inspected selectively; no wholesale import |
| `hebaelsherif.com-3.zip` | comparison only | inspected selectively; no wholesale import |
| `hebaelsawah.com` | public competitive reference | journey and information-density benchmark only; no text, design, code, or asset copied |

## Environment boundary

Production, DNS, nameservers, Supabase Production migration history, and provider configuration were not modified. Migration 043 remains the accepted live boundary; 044–047 remain Staging-only work after a recovery point and schema fingerprint.

