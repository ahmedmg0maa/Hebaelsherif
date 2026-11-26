-- 047: legal-content approval, version and effective-date governance
-- LOCAL-ONLY: do not apply outside an explicitly authorised staging window.

alter table public.pages
  add column if not exists legal_review_status text not null default 'not_applicable',
  add column if not exists legal_version text,
  add column if not exists effective_at date;

do $$ begin
  alter table public.pages add constraint pages_legal_review_status_check
    check (legal_review_status in ('not_applicable','draft','pending','approved'));
exception when duplicate_object then null; end $$;

comment on column public.pages.legal_review_status is 'Owner/legal approval state; legal pages must not publish unless approved.';
comment on column public.pages.legal_version is 'Owner-approved public legal document version.';
comment on column public.pages.effective_at is 'Date on which an approved legal version takes effect.';
