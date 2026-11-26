# Storage and media

## Baseline

Supabase Storage is used for payment proofs and protected learning resources. Existing upload actions validate the authenticated actor, file type, file size, ownership, and destination path before using privileged storage operations.

## Implemented media-library model (Phase 2)

- One `media_assets` record per uploaded object: bucket, path, public/private visibility, MIME type, bytes, optional dimensions, alt text, title, tags, uploader, and timestamps.
- `media_usages` records the entity, field, and asset; its restrictive foreign key prevents deleting an in-use asset.
- The central picker is integrated with product, course, book, workshop, and article cover editors while retaining an explicit external-URL escape hatch.
- The library supports search, bucket/type filters, pagination, public URL copy, metadata editing, and safe deletion with both usage-registry and legacy cover-reference checks.
- Images require useful Arabic alt text before publishing content that displays them.
- Private buckets return short-lived signed URLs after an authorization check; never persist signed URLs.

## Security rules

- Never accept a client-provided bucket/path without allow-list validation.
- Reject executable or ambiguous content, oversized files, and MIME/extension mismatches.
- Names are randomized; original names are metadata only.
- `payment-proofs` and course resources remain private. Public brand/editorial media may use a dedicated public bucket.
- Storage changes and destructive operations are audit logged.

## Verification

`pnpm verify:media` creates disposable public/private records and a tiny Storage object, proves anonymous visibility isolation and in-use deletion protection, and removes all evidence in a `finally` cleanup.
