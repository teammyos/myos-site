-- =====================================================================
-- BBM – מיגרציה 004: הקריאה ל-notify עוברת גם את אימות ה-JWT של Supabase
-- הפונקציה notify נשארת עם Verify JWT = ON. המסד שולח את המפתח הציבורי (anon)
-- בכותרת Authorization, ובנוסף את הסוד הפנימי x-bbm-secret.
-- שני הערכים נשמרים ב-private.settings ולא בקובץ הזה:
--   'notify_secret' – הסוד הפנימי (זהה לסוד NOTIFY_SECRET של הפונקציה)
--   'anon_jwt'      – המפתח הציבורי anon (Settings → API Keys → Legacy)
-- =====================================================================

create or replace function private.notify(p_kind text, p_user uuid)
returns void language plpgsql security definer set search_path = public, private, extensions as $$
declare v_secret text; v_anon text;
begin
  select value into v_secret from private.settings where key = 'notify_secret';
  select value into v_anon   from private.settings where key = 'anon_jwt';
  if v_secret is null or v_anon is null then return; end if;
  perform net.http_post(
    url     := 'https://sddlwpcyzzpblosxbmdw.supabase.co/functions/v1/notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon,
      'apikey', v_anon,
      'x-bbm-secret', v_secret),
    body    := jsonb_build_object('kind', p_kind, 'user_id', p_user)
  );
exception when others then
  raise warning 'notify failed: %', sqlerrm;
end $$;
revoke all on function private.notify(text, uuid) from public, anon, authenticated;
