-- V7: extend admin roles.
-- Kept in its own migration: enum values added here cannot be referenced in the
-- same transaction, so all usage lives in 0011+.

alter type public.app_role add value if not exists 'operations';
alter type public.app_role add value if not exists 'course_manager';
