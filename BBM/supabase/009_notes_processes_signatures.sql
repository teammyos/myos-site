-- =====================================================================
-- BBM – מיגרציה 009 (23.11.2026): הערות ותהליכים בנכס, ומעקב חתימות
-- בכל רשומה נשמרים אוטומטית מי רשם ומתי (נקבע בצד המסד, לא בדפדפן).
-- =====================================================================

-- מי המשתמש המחובר: שם מלא, ואם אין – מייל
create or replace function public.current_user_name() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(trim(full_name), ''), email) from public.app_users where id = auth.uid()
$$;

-- ---------- הערות בנכס ----------
create table if not exists public.asset_notes (
  id               uuid primary key default gen_random_uuid(),
  asset_id         uuid not null references public.assets(id) on delete cascade,
  body             text not null check (length(trim(body)) between 1 and 5000),
  created_by       uuid default auth.uid(),
  created_by_name  text,
  created_at       timestamptz not null default now()
);
create index if not exists asset_notes_asset on public.asset_notes(asset_id, created_at desc);

-- ---------- תהליכים בנכס ----------
create table if not exists public.asset_processes (
  id               uuid primary key default gen_random_uuid(),
  asset_id         uuid not null references public.assets(id) on delete cascade,
  process_type     text not null,
  description      text,
  status           text not null default 'active' check (status in ('active', 'pending', 'closed')),
  opened_by        uuid default auth.uid(),
  opened_by_name   text,
  opened_at        timestamptz not null default now(),
  status_by_name   text,           -- מי עדכן את הסטטוס לאחרונה
  status_at        timestamptz,    -- ומתי
  closed_at        timestamptz
);
create index if not exists asset_processes_asset on public.asset_processes(asset_id);
create index if not exists asset_processes_status on public.asset_processes(status);

-- ---------- מעקב חתימות (טופסי 4, תשריטי בית משותף) ----------
create table if not exists public.signatures (
  id                  uuid primary key default gen_random_uuid(),
  kind                text not null check (kind in ('form4', 'condo_plan')),
  sign_date           date,
  gush                text,
  helka               text,
  address             text,
  request_number      text,          -- טופס 4 בלבד
  essence             text,          -- מהות
  signed              boolean,       -- נחתם
  public_area_status  text,          -- טופס 4 בלבד: נמסר / לא קיים / לא נדרש ...
  notes               text,
  created_by          uuid default auth.uid(),
  created_by_name     text,
  created_at          timestamptz not null default now(),
  import_source_row   int
);
create index if not exists signatures_kind_date on public.signatures(kind, sign_date desc);
create index if not exists signatures_parcel on public.signatures(gush, helka);

-- ---------- מי ומתי – אוטומטי ----------
create or replace function public.stamp_author() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'asset_processes' then
    if tg_op = 'INSERT' then
      new.opened_by := auth.uid(); new.opened_by_name := public.current_user_name(); new.opened_at := now();
      if new.status = 'closed' then new.closed_at := now(); end if;
    elsif new.status is distinct from old.status then
      new.status_by_name := public.current_user_name(); new.status_at := now();
      new.closed_at := case when new.status = 'closed' then now() else null end;
    end if;
    if tg_op = 'UPDATE' then  -- פרטי הפתיחה לא משתנים
      new.opened_by := old.opened_by; new.opened_by_name := old.opened_by_name; new.opened_at := old.opened_at;
    end if;
  else
    if tg_op = 'INSERT' then
      new.created_by := auth.uid(); new.created_by_name := coalesce(public.current_user_name(), new.created_by_name);
    else
      new.created_by := old.created_by; new.created_by_name := old.created_by_name; new.created_at := old.created_at;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists asset_notes_stamp on public.asset_notes;
create trigger asset_notes_stamp before insert or update on public.asset_notes for each row execute function public.stamp_author();
drop trigger if exists asset_processes_stamp on public.asset_processes;
create trigger asset_processes_stamp before insert or update on public.asset_processes for each row execute function public.stamp_author();
drop trigger if exists signatures_stamp on public.signatures;
create trigger signatures_stamp before insert or update on public.signatures for each row execute function public.stamp_author();

-- ---------- הרשאות ----------
alter table public.asset_notes     enable row level security;
alter table public.asset_processes enable row level security;
alter table public.signatures      enable row level security;

do $$ declare t text; begin
  foreach t in array array['asset_notes', 'asset_processes', 'signatures'] loop
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select using (public.can_read())', t || '_read', t);
  end loop;
end $$;

-- הערות: כל מי שיש לו עריכה (גם מוגבלת) מוסיף; מוחק רק מי שכתב, או מנהל. אין עריכה של הערה אחרי שנרשמה.
drop policy if exists asset_notes_insert on public.asset_notes;
create policy asset_notes_insert on public.asset_notes for insert with check (public.can_edit_limited());
drop policy if exists asset_notes_delete on public.asset_notes;
create policy asset_notes_delete on public.asset_notes for delete using (created_by = auth.uid() or public.is_admin());

-- תהליכים: פתיחה ועדכון סטטוס – עריכה (גם מוגבלת); מחיקה – מנהל בלבד
drop policy if exists asset_processes_insert on public.asset_processes;
create policy asset_processes_insert on public.asset_processes for insert with check (public.can_edit_limited());
drop policy if exists asset_processes_update on public.asset_processes;
create policy asset_processes_update on public.asset_processes for update using (public.can_edit_limited()) with check (public.can_edit_limited());
drop policy if exists asset_processes_delete on public.asset_processes;
create policy asset_processes_delete on public.asset_processes for delete using (public.is_admin());

-- חתימות: עריכה מלאה
drop policy if exists signatures_write on public.signatures;
create policy signatures_write on public.signatures for all using (public.can_edit()) with check (public.can_edit());

grant select, insert, update, delete on public.asset_notes, public.asset_processes, public.signatures to authenticated;
notify pgrst, 'reload schema';
