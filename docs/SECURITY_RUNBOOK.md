# Security runbook

## Mandatory credential rotation before launch

Credentials supplied during development must be treated as compromised because they appeared in conversation history. In Supabase **Settings → API Keys**, create a new named `sb_secret` key, update `SUPABASE_SECRET_KEY` only in protected local/hosting environments, deploy, verify, and then delete the legacy `service_role` key. Do not paste the replacement into source, documentation, screenshots, logs, or chat.

The anon/publishable key is designed for client use but still relies on correct RLS. Rotate it if the project owner wants a complete credential reset. Change the initial admin password and enable a unique strong password before production use.

## Rotation procedure

1. Schedule a short maintenance window and identify every runtime using the credential.
2. Create a named server secret in Supabase; store the new value only in local `.env` and the hosting provider's encrypted environment settings.
3. Redeploy all server runtimes, run privileged smoke tests, then delete the previous legacy credential.
4. Run `pnpm audit:security`, `pnpm check:deploy`, and privileged smoke tests.
5. Review Supabase Auth and database logs for unexpected privileged activity; record the rotation date without recording the value.

## Incident response

1. Contain: revoke exposed keys/sessions and disable affected admin accounts.
2. Preserve evidence: export provider logs to a restricted location outside release artifacts.
3. Scope: review audit logs, auth events, storage access, role changes, payments, and exports.
4. Recover: patch the cause, rotate credentials, verify RLS/permissions, redeploy, and notify affected parties when required.
5. Record the incident and prevention actions in the private operational record.

## Safe status display

The admin system page may show only `configured` or `missing` for secrets. It must never render credential fragments, lengths, hashes, project link metadata, or environment dumps.

## Backup and restoration rehearsal

Physical database backups do not recover Storage objects removed after the backup. Confirm a current recovery point in **Database → Backups**, then rehearse restoration in an isolated branch or duplicate project; do not restore production simply to prove the procedure. Record the date, target, and pass/fail result in the restricted operational record without credentials or customer data.
