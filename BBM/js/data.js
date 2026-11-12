/*
 * שכבת הנתונים של אזור הנכסים.
 * כל הלוגיקה העסקית (קשרים, חישובי שטח, סינון) נמצאת כאן ולא במסכים.
 * שני מקורות אפשריים:
 *   demo – נתוני דוגמה בזיכרון (כש-config.js ריק). שינויים נמחקים ברענון.
 *   live – Supabase. דורש כניסת משתמש.
 */
(function () {
  const TABLES = ['complexes', 'parcels', 'holders', 'assets', 'asset_parcels', 'asset_holdings',
    'considerations', 'consideration_assets', 'consideration_surveys'];

  const cfg = window.BBM_CONFIG || {};
  // ?demo=1 מפעיל מצב הדגמה בלשונית הנוכחית, ?demo=0 מבטל
  const demoParam = new URLSearchParams(location.search).get('demo');
  try {
    if (demoParam === '1') sessionStorage.setItem('bbm_force_demo', '1');
    if (demoParam === '0') sessionStorage.removeItem('bbm_force_demo');
  } catch (e) { /* לא חובה */ }
  let forceDemo = false;
  try { forceDemo = sessionStorage.getItem('bbm_force_demo') === '1'; } catch (e) { forceDemo = demoParam === '1'; }
  const mode = !forceDemo && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY ? 'live' : 'demo';
  let sb = null;
  if (mode === 'live') sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  const db = {};          // מטמון של כל הטבלאות
  let lookups = {};       // list_name -> [{code,label,parent_code}]
  let loaded = false;

  const DEMO_KEY = 'bbm_demo_v1';
  const persistDemo = () => { try { sessionStorage.setItem(DEMO_KEY, JSON.stringify(db)); } catch (e) { /* לא חובה */ } };
  const resetDemo = () => { try { sessionStorage.removeItem(DEMO_KEY); } catch (e) { /* לא חובה */ } location.reload(); };
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'x' + Date.now() + Math.random());
  const now = () => new Date().toISOString();

  // ---------- טעינה ----------
  function lookupsFromJs() {
    const out = {};
    for (const [list, items] of Object.entries(window.BBM_LOOKUPS))
      out[list] = items.map(([code, label, parent_code], i) => ({ code, label, parent_code: parent_code || null, sort_order: i }));
    return out;
  }

  async function fetchAll(table) {
    const rows = []; const page = 1000;
    for (let from = 0; ; from += page) {
      const { data, error } = await sb.from(table).select('*').range(from, from + page - 1);
      if (error) throw error;
      rows.push(...data);
      if (data.length < page) return rows;
    }
  }

  async function init() {
    if (loaded) return;
    if (mode === 'demo') {
      // במצב הדגמה שינויים נשמרים בלשונית הנוכחית בלבד, כדי שאפשר יהיה לעבור בין דפים
      let saved = null;
      try { saved = JSON.parse(sessionStorage.getItem(DEMO_KEY) || 'null'); } catch (e) { saved = null; }
      if (saved) { for (const t of TABLES) db[t] = saved[t] || []; lookups = lookupsFromJs(); loaded = true; return; }
      const d = JSON.parse(JSON.stringify(window.BBM_DEMO));
      d.asset_parcels = d.asset_parcels.map(([asset_id, parcel_id]) => ({ asset_id, parcel_id }));
      d.consideration_assets = d.consideration_assets.map(([consideration_id, asset_id, role]) => ({ consideration_id, asset_id, role }));
      d.assets.forEach(a => { a.created_at = a.updated_at = '2026-11-05T08:00:00Z'; });
      for (const t of TABLES) db[t] = d[t] || [];
      lookups = lookupsFromJs();
    } else {
      const results = await Promise.all(TABLES.map(fetchAll));
      TABLES.forEach((t, i) => { db[t] = results[i]; });
      const lv = await fetchAll('lookup_values');
      lookups = lookupsFromJs();
      if (lv.length) {
        lookups = {};
        lv.filter(r => r.active).sort((a, b) => a.sort_order - b.sort_order)
          .forEach(r => (lookups[r.list_name] = lookups[r.list_name] || []).push(r));
      }
    }
    loaded = true;
  }

  // ---------- כתיבה ----------
  async function write(table, row, keys) {
    if (mode === 'demo') {
      const list = db[table];
      const match = r => keys.every(k => r[k] === row[k]);
      const i = list.findIndex(match);
      if (i >= 0) list[i] = { ...list[i], ...row }; else list.push(row);
      persistDemo();
      return row;
    }
    const { data, error } = await sb.from(table).upsert(row, { onConflict: keys.join(',') }).select().single();
    if (error) throw error;
    const list = db[table];
    const i = list.findIndex(r => keys.every(k => r[k] === data[k]));
    if (i >= 0) list[i] = data; else list.push(data);
    return data;
  }

  async function remove(table, where) {
    const keys = Object.keys(where);
    if (mode === 'live') {
      let q = sb.from(table).delete();
      keys.forEach(k => { q = q.eq(k, where[k]); });
      const { error } = await q; if (error) throw error;
    }
    db[table] = db[table].filter(r => !keys.every(k => r[k] === where[k]));
    if (mode === 'demo') persistDemo();
  }

  // ---------- רשימות ----------
  const label = (list, code) => {
    if (code == null || code === '') return '';
    const item = (lookups[list] || []).find(x => x.code === code);
    return item ? item.label : code;
  };
  const options = (list, parent) => (lookups[list] || []).filter(x => parent === undefined || x.parent_code === parent);

  // ---------- קריאה וקשרים ----------
  const byId = (table, id) => db[table].find(r => r.id === id) || null;
  const activeAssets = () => db.assets.filter(a => !a.deleted_at);

  function parcelText(p) { return p ? `${p.gush}/${p.helka}${p.sub_helka ? '/' + p.sub_helka : ''}` : ''; }

  function enrichAsset(a) {
    const parcels = db.asset_parcels.filter(x => x.asset_id === a.id).map(x => byId('parcels', x.parcel_id)).filter(Boolean);
    const holdings = db.asset_holdings.filter(h => h.asset_id === a.id)
      .map(h => ({ ...h, holder: byId('holders', h.holder_id) }));
    const current = holdings.find(h => !h.end_date || h.end_date >= now().slice(0, 10)) || null;
    const links = db.consideration_assets.filter(x => x.asset_id === a.id);
    const considerations = links.map(l => ({ role: l.role, ...byId('considerations', l.consideration_id) })).filter(c => c.id);
    return {
      ...a,
      address: [a.street, a.house_number].filter(Boolean).join(' '),
      parcels,
      parcels_text: parcels.map(parcelText).join(', '),
      parent: a.parent_asset_id ? byId('assets', a.parent_asset_id) : null,
      children: activeAssets().filter(c => c.parent_asset_id === a.id),
      complex: a.complex_id ? byId('complexes', a.complex_id) : null,
      holdings, current_holding: current,
      holder_name: current && current.holder ? current.holder.name : '',
      considerations,
      consideration_stage: considerations[0] ? considerations[0].stage : '',
      is_commercial: a.use_domain === 'commerce' || a.holding_purpose === 'income'
    };
  }

  function listAssets(f = {}) {
    const text = s => (s || '').toString().toLowerCase();
    return activeAssets().map(enrichAsset).filter(a => {
      if (f.q) {
        const hay = text([a.asset_number, a.name, a.address, a.holder_name, a.parcels_text, a.institution_name, a.institution_code, a.neighborhood].join(' '));
        if (!hay.includes(text(f.q))) return false;
      }
      if (f.gush && !a.parcels.some(p => p.gush === f.gush.trim() && (!f.helka || p.helka === f.helka.trim()))) return false;
      for (const k of ['physical_type', 'record_status', 'right_source', 'holding_purpose', 'use_domain', 'operational_status', 'complex_id'])
        if (f[k] && a[k] !== f[k]) return false;
      if (f.consideration_stage && a.consideration_stage !== f.consideration_stage) return false;
      if (f.holder_id && !(a.current_holding && a.current_holding.holder_id === f.holder_id)) return false;
      if (f.occupancy === 'vacant' && !['vacant', 'unused'].includes(a.operational_status)) return false;
      if (f.occupancy === 'in_use' && ['vacant', 'unused', 'unknown', undefined, null, ''].includes(a.operational_status)) return false;
      return true;
    }).sort((x, y) => String(x.asset_number).localeCompare(String(y.asset_number), 'he', { numeric: true }));
  }

  function getAsset(id) { const a = byId('assets', id); return a ? enrichAsset(a) : null; }

  // כל הצאצאים של נכס (למניעת לולאה: נכס לא יכול להיות אב של אביו)
  function descendants(id, acc = new Set()) {
    activeAssets().filter(a => a.parent_asset_id === id).forEach(c => { if (!acc.has(c.id)) { acc.add(c.id); descendants(c.id, acc); } });
    return acc;
  }

  // ---------- שמירת נכס ----------
  async function findOrCreateParcel({ gush, helka, sub_helka }) {
    gush = String(gush).trim(); helka = String(helka).trim(); sub_helka = String(sub_helka || '').trim();
    const existing = db.parcels.find(p => p.gush === gush && p.helka === helka && (p.sub_helka || '') === sub_helka);
    if (existing) return existing;
    return write('parcels', { id: uid(), gush, helka, sub_helka }, ['id']);
  }

  async function saveAsset(asset, parcelList) {
    const isNew = !asset.id;
    const row = { ...asset };
    if (isNew) row.id = uid();
    if (!row.asset_number) throw new Error('חובה למלא מספר נכס');
    const dup = db.assets.find(a => a.asset_number === row.asset_number && a.id !== row.id);
    if (dup) throw new Error('מספר הנכס כבר קיים במערכת (' + dup.asset_number + ')');
    if (row.parent_asset_id && (row.parent_asset_id === row.id || descendants(row.id).has(row.parent_asset_id)))
      throw new Error('נכס האב שנבחר הוא הנכס עצמו או אחד מנכסי המשנה שלו');
    for (const k of Object.keys(row)) if (row[k] === '') row[k] = null;
    if (mode === 'demo') { row.updated_at = now(); if (isNew) row.created_at = now(); }
    const saved = await write('assets', row, ['id']);

    if (parcelList) {
      const wanted = [];
      for (const p of parcelList.filter(p => p.gush && p.helka)) wanted.push((await findOrCreateParcel(p)).id);
      const current = db.asset_parcels.filter(x => x.asset_id === saved.id).map(x => x.parcel_id);
      for (const pid of current.filter(x => !wanted.includes(x))) await remove('asset_parcels', { asset_id: saved.id, parcel_id: pid });
      for (const pid of wanted.filter(x => !current.includes(x))) await write('asset_parcels', { asset_id: saved.id, parcel_id: pid }, ['asset_id', 'parcel_id']);
    }
    return saved;
  }

  async function softDeleteAsset(id) {
    if (activeAssets().some(a => a.parent_asset_id === id)) throw new Error('לנכס יש נכסי משנה. יש לטפל בהם קודם.');
    const a = byId('assets', id);
    return write('assets', { ...a, deleted_at: now() }, ['id']);
  }

  // ---------- מחזיקים והחזקות ----------
  async function saveHolder(h) { const row = { ...h, id: h.id || uid() }; return write('holders', row, ['id']); }
  async function saveHolding(h) { const row = { ...h, id: h.id || uid() }; for (const k of Object.keys(row)) if (row[k] === '') row[k] = null; return write('asset_holdings', row, ['id']); }
  async function deleteHolding(id) { return remove('asset_holdings', { id }); }

  // ---------- תמורות ציבוריות ----------
  function enrichConsideration(c) {
    const links = db.consideration_assets.filter(x => x.consideration_id === c.id);
    const assets = links.map(l => ({ role: l.role, ...(byId('assets', l.asset_id) || {}) })).filter(a => a.id && !a.deleted_at);
    const realized = assets.filter(a => a.role === 'realized');
    const delivered_calc = realized.length ? realized.reduce((s, a) => s + (Number(a.area_built) || 0), 0) : null;
    const surveys = db.consideration_surveys.filter(s => s.consideration_id === c.id).sort((a, b) => (b.survey_date || '').localeCompare(a.survey_date || ''));
    const holder = c.actual_holder_id ? byId('holders', c.actual_holder_id) : null;
    return { ...c, assets, realized, delivered_area: c.delivered_area_override != null ? c.delivered_area_override : delivered_calc,
      delivered_is_calc: c.delivered_area_override == null && delivered_calc != null,
      last_survey: surveys[0] || null, surveys, holder_name: holder ? holder.name : '' };
  }
  const listConsiderations = () => db.considerations.map(enrichConsideration)
    .sort((a, b) => String(a.process_number || '').localeCompare(String(b.process_number || ''), 'he', { numeric: true }));

  // ---------- ייצוא ----------
  function toCsv(rows, columns) {
    const esc = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const lines = [columns.map(c => esc(c.title)).join(',')];
    rows.forEach(r => lines.push(columns.map(c => esc(c.value(r))).join(',')));
    return '﻿' + lines.join('\r\n');   // BOM כדי שאקסל יזהה עברית
  }

  window.BBM = window.BBM || {};
  window.BBM.data = {
    mode, supabase: sb, init, resetDemo, label, options, parcelText,
    listAssets, getAsset, saveAsset, softDeleteAsset, descendants,
    holders: () => db.holders.slice().sort((a, b) => a.name.localeCompare(b.name, 'he')),
    complexes: () => db.complexes.slice(),
    allAssetsBrief: () => activeAssets().map(a => ({ id: a.id, asset_number: a.asset_number, name: a.name })),
    saveHolder, saveHolding, deleteHolding, toCsv, listConsiderations,
    _db: db
  };
})();
