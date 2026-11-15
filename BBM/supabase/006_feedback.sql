-- =====================================================================
-- BBM – מיגרציה 006: פניות משתמשים (שיפורים, הערות, תקלות) – 15.11.2026
-- כל משתמש מאושר שולח פנייה ורואה את הפניות שלו. מנהל רואה את כולן ומעדכן סטטוס.
-- פנייה חדשה שולחת מייל (Edge Function notify, kind = 'feedback').
-- כתובת היעד: הסוד FEEDBACK_TO של הפונקציה notify (כתובות מופרדות בפסיקים). אם לא הוגדר – לכל המנהלים.
-- =====================================================================

create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  user_id     uuid not null default auth.uid() references public.app_users(id) on delete cascade,
  category    text not null default 'improvement'
              check (category in ('improvement', 'ui', 'feature', 'bug', 'other')),
  subject     text not null check (length(trim(subject)) between 1 and 200),
  body        text not null check (length(trim(body)) between 1 and 5000),
  page_url    text,
  status      text not null default 'new' check (status in ('new', 'in_progress', 'done', 'declined')),
  admin_note  text,
  updated_at  timestamptz not null default now()
);
create index if not exists feedback_created on public.feedback(created_at desc);

alter table public.feedback enable row level security;

drop policy if exists feedback_insert on public.feedback;
create policy feedback_insert on public.feedback for insert to authenticated
  with check (public.can_read() and user_id = auth.uid() and status = 'new' and admin_note is null);

drop policy if exists feedback_select on public.feedback;
create policy feedback_select on public.feedback for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists feedback_update on public.feedback;
create policy feedback_update on public.feedback for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists feedback_delete on public.feedback;
create policy feedback_delete on public.feedback for delete to authenticated
  using (public.is_admin());

create or replace function public.feedback_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists feedback_touch on public.feedback;
create trigger feedback_touch before update on public.feedback
  for each row execute function public.feedback_touch();

-- מייל על פנייה חדשה (private.notify מ-004: שולח kind + מזהה)
create or replace function public.notify_on_feedback() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  perform private.notify('feedback', new.id);
  return new;
end $$;
drop trigger if exists feedback_notify on public.feedback;
create trigger feedback_notify after insert on public.feedback
  for each row execute function public.notify_on_feedback();

notify pgrst, 'reload schema';
