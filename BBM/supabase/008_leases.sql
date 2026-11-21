-- =====================================================================
-- BBM – מיגרציה 008: נכסים מושכרים – דמי שימוש וחוזה (21.11.2026)
-- רמה א' של ניהול כספים: חוזה, דמי שימוש חודשיים ותמונת מצב של יתרת החוב.
-- end_date = מתי המחזיק עזב (היסטוריה). contract_end = עד מתי החוזה בתוקף.
-- =====================================================================
alter table public.asset_holdings add column if not exists monthly_fee            numeric;  -- דמי שימוש חודשיים, לפני מע"מ
alter table public.asset_holdings add column if not exists vat_applies            boolean;  -- עוסק (חל מע"מ) / מגורים
alter table public.asset_holdings add column if not exists contract_end           date;     -- תוקף החוזה
alter table public.asset_holdings add column if not exists balance_snapshot       numeric;  -- יתרת חוב (חיובי = חוב, שלילי = זכות)
alter table public.asset_holdings add column if not exists balance_snapshot_date  date;     -- נכון לתאריך
alter table public.assets         add column if not exists managed_by             text;     -- חברת ניהול (אם הנכס מנוהל בידי חברה)
notify pgrst, 'reload schema';
