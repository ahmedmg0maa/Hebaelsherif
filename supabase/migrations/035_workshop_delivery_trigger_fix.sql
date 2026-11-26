-- 035: workshop delivery capture must run after the parent workshop exists.
drop trigger if exists workshops_private_meeting_url on public.workshops;
create or replace function public.capture_workshop_meeting_url() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.meeting_url is not null then
    insert into public.workshop_delivery(workshop_id,meeting_url) values(new.id,new.meeting_url)
    on conflict(workshop_id) do update set meeting_url=excluded.meeting_url,updated_at=now();
    update public.workshops set meeting_url=null where id=new.id and meeting_url is not null;
  end if;
  return new;
end $$;
create trigger workshops_private_meeting_url after insert or update of meeting_url on public.workshops for each row execute function public.capture_workshop_meeting_url();
