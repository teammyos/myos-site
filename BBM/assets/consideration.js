// עריכת תהליך תמורה ציבורית. נפתח מכרטיס הנכס (לשונית "תמורה ציבורית").
// תהליך אחד יכול להיות משותף לכמה נכסים (אותה בקשה להיתר) – שינוי כאן נראה בכולם.
(async function () {
  const { ui, data } = BBM;
  if (!(await ui.start({ base: '../', active: 'assets' }))) return;
  const esc = ui.esc, sel = ui.selectHtml, form = document.getElementById('form');
  if (!ui.canEdit()) { form.outerHTML = '<div class="card">אין לך הרשאת עריכה.</div>'; return; }

  const c = data.listConsiderations().find(x => x.id === ui.param('id'));
  if (!c) { form.outerHTML = '<div class="card error">תהליך התמורה לא נמצא.</div>'; return; }
  const backAsset = ui.param('asset');
  const back = backAsset ? `asset.html?id=${encodeURIComponent(backAsset)}#cons` : ui.listUrl('../');
  document.getElementById('backLink').href = back;
  document.getElementById('title').textContent = 'עריכת נתוני תמורה ציבורית' + (c.request_number ? ` · בקשה ${c.request_number}` : '');
  const linked = c.assets || [];
  document.getElementById('sub').innerHTML = linked.length > 1
    ? `<strong>שימו לב:</strong> הבקשה משותפת ל-${linked.length} נכסים (${linked.map(x => esc(x.asset_number)).join(', ')}). שינוי כאן יופיע בכולם.`
    : 'פרטי התהליך מול היזם: התחייבות, היתר, טופס 4, שטחים ורישום.';

  const v = k => esc(c[k] == null ? '' : c[k]);
  const field = (label, html, cls = '') => `<label class="f ${cls}">${label}${html}</label>`;
  const input = (name, type = 'text', extra = '') => `<input name="${name}" type="${type}" value="${v(name)}" ${extra}>`;
  const num = name => input(name, 'number', 'min="0" step="any" inputmode="decimal"');
  const area = (name, rows = 3) => `<textarea name="${name}" rows="${rows}">${v(name)}</textarea>`;
  const yn = name => `<select name="${name}"><option value="">לא ידוע</option>
    <option value="true"${c[name] === true ? ' selected' : ''}>כן</option><option value="false"${c[name] === false ? ' selected' : ''}>לא</option></select>`;

  form.innerHTML = `
    <details class="section" open><summary>1. הבקשה והיזם</summary><div class="body">
      ${field('מספר בקשה להיתר', input('request_number'))}
      ${field('שלב', sel('stage', 'consideration_stage', c.stage, { empty: '— בחר —' }))}
      ${field('כתובת הבקשה', input('project_name'), 'full')}
      ${field('יזם', input('developer'), 'full')}
    </div></details>

    <details class="section" open><summary>2. התחייבות, היתר וטופס 4</summary><div class="body">
      ${field('יש התחייבות', yn('has_commitment'))}
      ${field('היזם בונה את השטח', yn('developer_builds'))}
      ${field('פרסום 77', input('publication_77', 'text', 'placeholder="לפני פרסום / אחרי פרסום"'))}
      ${field('יש היתר', yn('has_permit'))}
      ${field('תאריך היתר', input('permit_date', 'date'))}
      ${field('יש טופס 4', yn('has_form4'))}
      ${field('תאריך טופס 4', input('form4_date', 'date'))}
      ${field('מסירה וחזקה', input('handover_status'))}
    </div></details>

    <details class="section" open><summary>3. שטחים (מ"ר)</summary><div class="body">
      ${field('שטח שהובטח', num('promised_area'))}
      ${field('40% מקומה א\'', num('area_floor40'))}
      ${field('לפי החלטת ועדה', num('area_committee'))}
      ${field('לפי היתר', num('permit_area'))}
      ${field('לפי התחייבות', num('area_commitment'))}
      ${field('התאמת שטחים', sel('area_match', 'area_match', c.area_match, { empty: '— בחר —' }))}
      ${field('הערת תאימות שטחים', area('area_match_note'), 'full')}
    </div></details>

    <details class="section" open><summary>4. רישום</summary><div class="body">
      ${field('ייפוי כוח', yn('power_of_attorney'))}
      ${field('הערת אזהרה (סעיף 126)', yn('section_126'))}
      ${field('הפקעה', input('expropriation_note'), 'full')}
    </div></details>

    <details class="section" open><summary>5. טיפול והערות</summary><div class="body">
      ${field('פעולה נדרשת', area('required_action'), 'full')}
      ${field('הערות התהליך', area('notes', 6), 'full')}
    </div></details>

    <div class="sticky-actions"><button class="primary" type="submit">שמירה</button> <a class="btn" href="${back}">ביטול</a></div>`;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(form), row = { id: c.id };
    const TEXT = ['request_number', 'stage', 'project_name', 'developer', 'publication_77', 'handover_status', 'area_match',
      'area_match_note', 'expropriation_note', 'required_action', 'notes'];
    const NUM = ['promised_area', 'area_floor40', 'area_committee', 'permit_area', 'area_commitment'];
    const BOOL = ['has_commitment', 'developer_builds', 'has_permit', 'has_form4', 'power_of_attorney', 'section_126'];
    const DATE = ['permit_date', 'form4_date'];
    TEXT.forEach(k => { const t = String(fd.get(k) || '').trim(); row[k] = t || null; });
    NUM.forEach(k => { const t = String(fd.get(k) || '').trim(); row[k] = t === '' ? null : Number(t); });
    BOOL.forEach(k => { const t = fd.get(k); row[k] = t === 'true' ? true : t === 'false' ? false : null; });
    DATE.forEach(k => { row[k] = fd.get(k) || null; });
    if (!row.stage) row.stage = 'unknown';
    if (!row.area_match) row.area_match = 'not_checked';
    const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
    try { await data.saveConsideration(row); ui.toast('התמורה נשמרה'); location.href = back; }
    catch (err) { ui.toast(err.message || String(err), 'err'); btn.disabled = false; }
  });
})();
