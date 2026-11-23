-- =====================================================================
-- BBM – מיגרציה 010 (23.11.2026): מעקב חתימות – ארבעת הדוחות
-- נוספים: מעקב רישום הפקעות (expropriation) ודו"ח תצ"רים (tatzar).
-- השדות הייחודיים לכל דוח נשמרים בעמודה extra (JSON); תאריך או "V" נשמרים כטקסט.
-- =====================================================================
alter table public.signatures add column if not exists extra jsonb not null default '{}'::jsonb;
alter table public.signatures drop constraint if exists signatures_kind_check;
alter table public.signatures add constraint signatures_kind_check check (kind in ('form4', 'condo_plan', 'expropriation', 'tatzar'));
notify pgrst, 'reload schema';
