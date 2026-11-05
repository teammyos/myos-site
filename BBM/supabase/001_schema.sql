-- =====================================================================
-- BBM – מערכת ניהול נכסים · סכמה ראשונית (גרסה 1)
-- מריצים פעם אחת ב-Supabase: SQL Editor → New query → הדבקה → Run.
-- אחר כך מריצים את 002_lookups.sql.
-- =====================================================================

-- ---------- משתמשים והרשאות (משותף לכל אתר BBM) ----------
create table if not exists public.app_users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  role        text not null default 'viewer'
              check (role in ('viewer','editor_limited','editor','admin')),
  approved    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- כל נרשם חדש נכנס כ"צפייה", ממתין לאישור מנהל
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.app_users (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- פונקציות עזר להרשאות
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.app_users where id = auth.uid() and approved
$$;
create or replace function public.can_read() returns boolean
language sql stable as $$ select public.my_role() is not null $$;
create or replace function public.can_edit() returns boolean
language sql stable as $$ select public.my_role() in ('editor','admin') $$;
create or replace function public.can_edit_limited() returns boolean
language sql stable as $$ select public.my_role() in ('editor_limited','editor','admin') $$;
create or replace function public.is_admin() returns boolean
language sql stable as $$ select public.my_role() = 'admin' $$;

-- ---------- רשימות מערכת ----------
create table if not exists public.lookup_values (
  list_name   text not null,
  code        text not null,
  label       text not null,
  parent_code text,
  sort_order  int not null default 0,
  active      boolean not null default true,
  primary key (list_name, code)
);

-- ---------- מתחמים ----------
create table if not exists public.complexes (
  id          uuid primary key default gen_random_uuid(),
  complex_number text unique,
  name        text not null,
  description text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- נכסים ----------
create table if not exists public.assets (
  id                  uuid primary key default gen_random_uuid(),
  asset_number        text unique not null,
  name                text,
  record_status       text not null default 'existing',
  physical_type       text not null default 'other',
  parent_asset_id     uuid references public.assets(id),
  complex_id          uuid references public.complexes(id),
  street              text,
  house_number        text,
  address_note        text,
  planning_designation text,
  plan_number         text,
  use_domain          text,
  use_detail          text,
  institution_name    text,
  holding_purpose     text,
  right_type          text,
  right_source        text,
  physical_condition  text,
  operational_status  text,
  realization_status  text default 'not_relevant',
  area_built          numeric,
  area_yard           numeric,
  folder_path         text,          -- נתיב לתיקיית המסמכים המקומית
  permit_number       text,
  notes               text,
  import_source_file  text,
  import_source_sheet text,
  import_source_row   int,
  deleted_at          timestamptz,   -- מחיקה רכה בלבד
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint asset_not_own_parent check (parent_asset_id is null or parent_asset_id <> id)
);
create index if not exists assets_parent_idx on public.assets(parent_asset_id);
create index if not exists assets_complex_idx on public.assets(complex_id);

-- ---------- חלקות וקשר רבים-לרבים ----------
create table if not exists public.parcels (
  id          uuid primary key default gen_random_uuid(),
  gush        text not null,
  helka       text not null,
  sub_helka   text not null default '',
  notes       text,
  unique (gush, helka, sub_helka)
);

create table if not exists public.asset_parcels (
  asset_id    uuid not null references public.assets(id) on delete cascade,
  parcel_id   uuid not null references public.parcels(id) on delete cascade,
  area_in_parcel numeric,
  notes       text,
  primary key (asset_id, parcel_id)
);

-- ---------- מחזיקים והחזקה ----------
create table if not exists public.holders (
  id            uuid primary key default gen_random_uuid(),
  holder_type   text,
  name          text not null,
  id_number     text,
  contact_name  text,
  phone         text,
  email         text,
  notes         text,
  created_at    timestamptz not null default now()
);

create table if not exists public.asset_holdings (
  id                uuid primary key default gen_random_uuid(),
  asset_id          uuid not null references public.assets(id) on delete cascade,
  holder_id         uuid not null references public.holders(id),
  holding_method    text,
  use_detail        text,
  area              numeric,
  start_date        date,
  end_date          date,
  agreement_status  text,
  notes             text,
  created_at        timestamptz not null default now()
);

-- ---------- תמורות ציבוריות ----------
create table if not exists public.considerations (
  id                 uuid primary key default gen_random_uuid(),
  process_number     text unique,
  project_name       text,
  address            text,
  developer          text,
  request_number     text,
  has_commitment     boolean,
  promised_area      numeric,
  promised_yard_area numeric,
  planned_use        text,
  has_permit         boolean,
  permit_date        date,
  permit_area        numeric,
  has_form4          boolean,
  form4_date         date,
  stage              text default 'unknown',
  handover_status    text,
  delivered_area_override numeric,
  actual_use         text,
  actual_holder_id   uuid references public.holders(id),
  is_vacant          boolean,
  area_match         text default 'not_checked',
  required_action    text,
  priority           text,
  notes              text,
  import_source_row  int,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists public.consideration_assets (
  consideration_id uuid not null references public.considerations(id) on delete cascade,
  asset_id         uuid not null references public.assets(id) on delete cascade,
  role             text not null default 'realized'
                   check (role in ('commitment','realized')),
  primary key (consideration_id, asset_id)
);

create table if not exists public.consideration_surveys (
  id                 uuid primary key default gen_random_uuid(),
  consideration_id   uuid not null references public.considerations(id) on delete cascade,
  survey_date        date not null default current_date,
  surveyor           text,
  located            boolean,
  physical_condition text,
  delivered_to_city  boolean,
  city_holds         boolean,
  is_vacant          boolean,
  current_use        text,
  actual_holder      text,
  found_area         numeric,
  area_match         text,
  defects            text,
  required_action    text,
  priority           text,
  notes              text,
  created_by         uuid default auth.uid(),
  created_at         timestamptz not null default now()
);

-- ---------- עדכון אוטומטי של תאריך עדכון ----------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists assets_touch on public.assets;
create trigger assets_touch before update on public.assets
  for each row execute function public.touch_updated_at();
drop trigger if exists considerations_touch on public.considerations;
create trigger considerations_touch before update on public.considerations
  for each row execute function public.touch_updated_at();
drop trigger if exists complexes_touch on public.complexes;
create trigger complexes_touch before update on public.complexes
  for each row execute function public.touch_updated_at();

-- ---------- הרשאות (RLS) ----------
-- קריאה: משתמש מאושר. עריכה מלאה: editor/admin.
-- עריכה מוגבלת (editor_limited): ביקורות/סקר והחזקות בלבד.
do $$
declare t text;
begin
  foreach t in array array['lookup_values','complexes','assets','parcels','asset_parcels',
                           'holders','asset_holdings','considerations','consideration_assets',
                           'consideration_surveys'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t||'_read', t);
    execute format('create policy %I on public.%I for select using (public.can_read())', t||'_read', t);
  end loop;

  foreach t in array array['complexes','assets','parcels','asset_parcels','holders',
                           'considerations','consideration_assets'] loop
    execute format('drop policy if exists %I on public.%I', t||'_write', t);
    execute format('create policy %I on public.%I for all using (public.can_edit()) with check (public.can_edit())', t||'_write', t);
  end loop;

  foreach t in array array['asset_holdings','consideration_surveys'] loop
    execute format('drop policy if exists %I on public.%I', t||'_write', t);
    execute format('create policy %I on public.%I for all using (public.can_edit_limited()) with check (public.can_edit_limited())', t||'_write', t);
  end loop;
end $$;

drop policy if exists lookup_values_admin on public.lookup_values;
create policy lookup_values_admin on public.lookup_values
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.app_users enable row level security;
drop policy if exists app_users_self on public.app_users;
create policy app_users_self on public.app_users for select
  using (id = auth.uid() or public.is_admin());
drop policy if exists app_users_admin on public.app_users;
create policy app_users_admin on public.app_users for update
  using (public.is_admin()) with check (public.is_admin());
