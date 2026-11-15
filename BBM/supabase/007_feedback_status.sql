-- =====================================================================
-- BBM – מיגרציה 007: מייל לשולח כשפנייה מסומנת "טופלה" או "לא תטופל" (15.11.2026)
-- =====================================================================
create or replace function public.notify_on_feedback_status() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  if new.status in ('done', 'declined') and new.status is distinct from old.status then
    perform private.notify('feedback_status', new.id);
  end if;
  return new;
end $$;
drop trigger if exists feedback_notify_status on public.feedback;
create trigger feedback_notify_status after update of status on public.feedback
  for each row execute function public.notify_on_feedback_status();
