-- =====================================================================
-- BBM – מיגרציה 005: שדות חדשים בעקבות מיפוי האקסל (12.11.2026)
-- ראו מיפוי-ייבוא-אקסל.md, סעיף 3.
-- =====================================================================

-- נכס
alter table public.assets add column if not exists neighborhood text;   -- שכונה ("אזור" באקסל)
alter table public.assets add column if not exists street_code  text;   -- קוד רחוב עירוני
alter table public.assets add column if not exists institution_code text; -- סמל מוסד (סמל גן לפי אגף החינוך)

-- תהליך תמורה
alter table public.considerations add column if not exists publication_77      text;     -- לפני / אחרי פרסום
alter table public.considerations add column if not exists developer_builds    boolean;  -- התחייבות לבינוי
alter table public.considerations add column if not exists area_floor40        numeric;  -- 40% מקומה א'
alter table public.considerations add column if not exists area_committee      numeric;  -- לפי החלטת ועדה
alter table public.considerations add column if not exists area_commitment     numeric;  -- לפי התחייבות
alter table public.considerations add column if not exists area_match_note     text;     -- הטקסט המקורי של "תאימות שטחים"
alter table public.considerations add column if not exists power_of_attorney   boolean;  -- ייפוי כוח
alter table public.considerations add column if not exists section_126         boolean;  -- הערת אזהרה לפי סעיף 126
alter table public.considerations add column if not exists expropriation_note  text;     -- הפקעה

-- ביקורות שיובאו מהאקסל: מפתח קבוע כדי שייבוא חוזר יעדכן ולא יכפיל
alter table public.consideration_surveys add column if not exists import_key text;
create unique index if not exists consideration_surveys_import_key on public.consideration_surveys(import_key);
