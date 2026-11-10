-- =====================================================================
-- BBM – מיגרציה 003: מיילים אוטומטיים (נרשם חדש → מנהלים, אישור → משתמש)
-- דורש: הפונקציה notify פרוסה (supabase/functions/notify), עם הסודות שלה.
-- הסוד המשותף נשמר בטבלה private.settings ולא בקובץ הזה (המאגר ציבורי):
--   insert into private.settings(key, value) values ('notify_secret', '<סוד>')
--   on conflict (key) do update set value = excluded.value;
-- =====================================================================

create extension if not exists pg_net with schema extensions;

-- סכמה פרטית: לא נחשפת דרך ה-API של האתר
create schema if not exists private;
revoke all on schema private from anon, authenticated;

create table if not exists private.settings (
  key   text primary key,
  value text not null
);
revoke all on private.settings from anon, authenticated;

-- קריאה לפונקציה notify. לא חוסמת: אם השליחה נכשלת, ההרשמה/האישור עצמם נשמרים.
create or replace function private.notify(p_kind text, p_user uuid)
returns void language plpgsql security definer set search_path = public, private, extensions as $$
declare v_secret text;
begin
  select value into v_secret from private.settings where key = 'notify_secret';
  if v_secret is null then return; end if;
  perform net.http_post(
    url     := 'https://sddlwpcyzzpblosxbmdw.supabase.co/functions/v1/notify',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-bbm-secret', v_secret),
    body    := jsonb_build_object('kind', p_kind, 'user_id', p_user)
  );
exception when others then
  raise warning 'notify failed: %', sqlerrm;
end $$;
revoke all on function private.notify(text, uuid) from public, anon, authenticated;

-- 1. נרשם חדש → מייל למנהלים
create or replace function public.notify_on_signup() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  if not new.approved then perform private.notify('signup', new.id); end if;
  return new;
end $$;
drop trigger if exists app_users_notify_signup on public.app_users;
create trigger app_users_notify_signup after insert on public.app_users
  for each row execute function public.notify_on_signup();

-- 2. חשבון אושר (false → true) → מייל למשתמש
create or replace function public.notify_on_approve() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  if new.approved and not coalesce(old.approved, false) then perform private.notify('approved', new.id); end if;
  return new;
end $$;
drop trigger if exists app_users_notify_approve on public.app_users;
create trigger app_users_notify_approve after update of approved on public.app_users
  for each row execute function public.notify_on_approve();
