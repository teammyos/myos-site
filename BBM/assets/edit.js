(async function () {
  const { ui, data } = BBM;
  if (!(await ui.start({ base: '../', active: 'assets' }))) return;
  const esc = ui.esc, sel = ui.selectHtml, form = document.getElementById('form');
  if (!ui.canEdit()) { form.outerHTML = '<div class="card">אין לך הרשאת עריכה.</div>'; return; }

  const id = ui.param('id');
  const existing = id ? data.getAsset(id) : null;
  if (id && !existing) { form.outerHTML = '<div class="card error">הנכס לא נמצא.</div>'; return; }
  const parentParam = ui.param('parent');
  const parentAsset = parentParam ? data.getAsset(parentParam) : null;

  // ערכי פתיחה: נכס קיים, או נכס משנה שיורש כתובת ומקור זכות מהאב
  const a = existing || {
    record_status: 'existing', physical_type: parentAsset ? 'unit' : '',
    parent_asset_id: parentAsset ? parentAsset.id : '',
    street: parentAsset ? parentAsset.street : '', house_number: parentAsset ? parentAsset.house_number : '',
    right_type: parentAsset ? parentAsset.right_type : '', right_source: parentAsset ? parentAsset.right_source : '',
    complex_id: parentAsset ? parentAsset.complex_id : ''
  };
  const parcels = existing ? existing.parcels.map(p => ({ ...p })) : (parentAsset ? parentAsset.parcels.map(p => ({ ...p })) : []);
  document.getElementById('title').textContent = existing ? `עריכת נכס ${existing.asset_number}` : (parentAsset ? `נכס משנה חדש תחת ${parentAsset.asset_number}` : 'נכס חדש');
  document.getElementById('backLink').href = existing ? `asset.html?id=${encodeURIComponent(existing.id)}` : (parentAsset ? `asset.html?id=${encodeURIComponent(parentAsset.id)}` : 'index.html');

  const v = k => esc(a[k] == null ? '' : a[k]);
  const field = (label, html, cls = '') => `<label class="f ${cls}">${label}${html}</label>`;
  const input = (name, type = 'text', extra = '') => `<input name="${name}" type="${type}" value="${v(name)}" ${extra}>`;

  // נכס אב: כל הנכסים מלבד הנכס עצמו וצאצאיו
  const blocked = existing ? new Set([existing.id, ...data.descendants(existing.id)]) : new Set();
  const parentOptions = data.allAssetsBrief().filter(x => !blocked.has(x.id))
    .sort((x, y) => String(x.asset_number).localeCompare(String(y.asset_number), 'he', { numeric: true }))
    .map(x => `<option value="${esc(x.id)}"${x.id === a.parent_asset_id ? ' selected' : ''}>${esc(x.asset_number)} · ${esc(x.name || '')}</option>`).join('');
  const complexOptions = data.complexes().map(c => `<option value="${esc(c.id)}"${c.id === a.complex_id ? ' selected' : ''}>${esc(c.complex_number || '')} · ${esc(c.name)}</option>`).join('');
  const holding = existing && existing.current_holding ? existing.current_holding : {};
  const holderOptions = data.holders().map(h => `<option value="${esc(h.id)}"${h.id === holding.holder_id ? ' selected' : ''}>${esc(h.name)}</option>`).join('');
  const hv = k => esc(holding[k] == null ? '' : holding[k]);

  form.innerHTML = `
    <details class="section" open><summary>1. זיהוי וסיווג</summary><div class="body">
      ${field('מספר נכס *', input('asset_number', 'text', 'required'))}
      ${field('שם / תיאור', input('name'), 'full')}
      ${field('קיים / עתידי', sel('record_status', 'record_status', a.record_status, { empty: '— בחר —' }))}
      ${field('סוג פיזי', sel('physical_type', 'physical_type', a.physical_type))}
      ${field('מצב מימוש', sel('realization_status', 'realization_status', a.realization_status || 'not_relevant'))}
      <p class="hint full">נכס עתידי (למשל התחייבות יזם) מקבל מספר זמני, כמו T-2026-001, עד לקביעת מספר סופי.</p>
    </div></details>

    <details class="section" open><summary>2. מיקום וגוש/חלקה</summary><div class="body">
      ${field('רחוב', input('street'))}
      ${field('מספר בית', input('house_number'))}
      ${field('הערת כתובת', input('address_note', 'text', 'placeholder="למשל: בניין מס׳ 13"'))}
      ${field('שכונה', input('neighborhood'))}
      ${field('קוד רחוב', input('street_code'))}
      ${field('ייעוד תכנוני', input('planning_designation', 'text', 'placeholder="למשל: שב״צ, שצ״פ, דרך"'))}
      ${field('תכנית', input('plan_number'))}
      <div class="full"><div class="hint" style="margin-bottom:6px">חלקות (נכס יכול לשבת על כמה חלקות)</div>
        <div id="parcels"></div><button type="button" id="addParcel">+ הוספת חלקה</button></div>
    </div></details>

    <details class="section" ${a.parent_asset_id || a.complex_id ? 'open' : ''}><summary>3. היררכיה ומתחם</summary><div class="body">
      ${field('נכס אב', `<select name="parent_asset_id"><option value="">— ללא נכס אב —</option>${parentOptions}</select>`, 'full')}
      ${field('מתחם', `<select name="complex_id"><option value="">— ללא מתחם —</option>${complexOptions}</select>`)}
      <p class="hint full">נכס אב = הנכס הפיזי שהנכס נמצא בתוכו. שיתוף באותה חלקה אינו מצריך נכס אב.</p>
    </div></details>

    <details class="section" open><summary>4. זכויות</summary><div class="body">
      ${field('סוג הזכות', sel('right_type', 'right_type', a.right_type))}
      ${field('מקור הזכות', sel('right_source', 'right_source', a.right_source))}
    </div></details>

    <details class="section" open><summary>5. שימוש ומטרת החזקה</summary><div class="body">
      ${field('מטרת החזקה', sel('holding_purpose', 'holding_purpose', a.holding_purpose))}
      ${field('תחום שימוש ראשי', sel('use_domain', 'use_domain', a.use_domain))}
      ${field('שימוש מפורט', '<span id="useDetailWrap"></span>')}
      ${field('שם מוסד', input('institution_name'))}
      ${field('סמל מוסד', input('institution_code'))}
    </div></details>

    <details class="section" ${holding.holder_id ? 'open' : ''}><summary>6. מחזיק</summary><div class="body">
      ${field('מחזיק קיים', `<select name="h_holder_id"><option value="">— ללא / מחזיק חדש —</option>${holderOptions}</select>`)}
      ${field('או שם מחזיק חדש', '<input name="h_new_name">')}
      ${field('סוג מחזיק (למחזיק חדש)', sel('h_new_type', 'holder_type', ''))}
      ${field('איש קשר (למחזיק חדש)', '<input name="h_new_contact">')}
      ${field('טלפון (למחזיק חדש)', '<input name="h_new_phone" inputmode="tel">')}
      ${field('אופן ההחזקה', sel('h_holding_method', 'holding_method', holding.holding_method))}
      <div class="full commercial-only"><div class="hint">נתוני נכס מסחרי / מניב</div></div>
      ${field('מצב הסכם', sel('h_agreement_status', 'agreement_status', holding.agreement_status), 'commercial-only')}
      ${field('תאריך התחלה', `<input type="date" name="h_start_date" value="${hv('start_date')}">`, 'commercial-only')}
      ${field('תאריך סיום', `<input type="date" name="h_end_date" value="${hv('end_date')}">`, 'commercial-only')}
    </div></details>

    <details class="section" open><summary>7. מצב</summary><div class="body">
      ${field('מצב תפעולי', sel('operational_status', 'operational_status', a.operational_status))}
      ${field('מצב פיזי', sel('physical_condition', 'physical_condition', a.physical_condition))}
      ${field('שטח בנוי (מ"ר)', input('area_built', 'number', 'step="0.01" min="0"'))}
      ${field('שטח חצר (מ"ר)', input('area_yard', 'number', 'step="0.01" min="0"'))}
    </div></details>

    <details class="section" open><summary>8. מסמכים והערות</summary><div class="body">
      ${field('נתיב לתיקיית המסמכים', input('folder_path', 'text', 'dir="ltr" placeholder="S:\\נכסים\\..."'), 'full')}
      ${field('הערות', `<textarea name="notes">${v('notes')}</textarea>`, 'full')}
      <p class="hint full consideration-only">הנכס מסומן כתמורה ציבורית. נתוני התמורה (יזם, היתר, טופס 4, שטחים) מנוהלים במסך התמורות ומוצגים בכרטיס הנכס.</p>
    </div></details>

    <div class="sticky-actions">
      <button class="primary" type="submit">שמירה</button>
      <a class="btn" href="${document.getElementById('backLink').href}">ביטול</a>
    </div>`;

  // שימוש מפורט תלוי בתחום הראשי
  function renderUseDetail() {
    const domain = form.elements.use_domain.value;
    const current = form.elements.use_detail ? form.elements.use_detail.value : a.use_detail;
    const opts = domain ? data.options('use_detail', domain) : [];
    document.getElementById('useDetailWrap').innerHTML = opts.length
      ? sel('use_detail', 'use_detail', current, { parent: domain })
      : '<select name="use_detail" disabled><option value="">— בחר תחום ראשי עם פירוט —</option></select>';
  }
  // מקטעים מותנים
  function toggles() {
    const commercial = form.elements.use_domain.value === 'commerce' || form.elements.holding_purpose.value === 'income';
    form.querySelectorAll('.commercial-only').forEach(el => { el.hidden = !commercial; });
    form.querySelectorAll('.consideration-only').forEach(el => { el.hidden = form.elements.right_source.value !== 'public_consideration'; });
  }
  form.elements.use_domain.addEventListener('change', () => { renderUseDetail(); toggles(); });
  form.elements.holding_purpose.addEventListener('change', toggles);
  form.elements.right_source.addEventListener('change', toggles);
  renderUseDetail(); toggles();

  // חלקות
  const box = document.getElementById('parcels');
  function parcelRow(p = {}) {
    const div = document.createElement('div'); div.className = 'parcel-row';
    div.innerHTML = `<input placeholder="גוש" data-k="gush" value="${esc(p.gush || '')}" inputmode="numeric" aria-label="גוש">
      <input placeholder="חלקה" data-k="helka" value="${esc(p.helka || '')}" inputmode="numeric" aria-label="חלקה">
      <input placeholder="תת־חלקה" data-k="sub_helka" value="${esc(p.sub_helka || '')}" aria-label="תת חלקה">
      <button type="button" aria-label="הסרת חלקה">הסרה</button>`;
    div.querySelector('button').onclick = () => div.remove();
    box.appendChild(div);
  }
  (parcels.length ? parcels : [{}]).forEach(parcelRow);
  document.getElementById('addParcel').onclick = () => parcelRow();

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const fields = ['asset_number', 'name', 'record_status', 'physical_type', 'realization_status', 'street', 'house_number',
      'address_note', 'neighborhood', 'street_code', 'institution_code',
      'planning_designation', 'plan_number', 'parent_asset_id', 'complex_id', 'right_type', 'right_source', 'holding_purpose',
      'use_domain', 'use_detail', 'institution_name', 'operational_status', 'physical_condition', 'area_built', 'area_yard',
      'folder_path', 'notes'];
    const row = existing ? { id: existing.id } : {};
    fields.forEach(k => { const val = fd.get(k); row[k] = val == null ? null : String(val).trim(); });
    // שומרים רק עמודות של טבלת הנכסים, בלי שדות מחושבים
    if (existing) for (const k of ['import_source_file', 'import_source_sheet', 'import_source_row', 'created_at']) if (existing[k] != null) row[k] = existing[k];
    const parcelList = [...box.querySelectorAll('.parcel-row')].map(r => Object.fromEntries([...r.querySelectorAll('input')].map(i => [i.dataset.k, i.value])));
    const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      const saved = await data.saveAsset(row, parcelList);
      // מחזיק
      let holderId = fd.get('h_holder_id');
      const newName = String(fd.get('h_new_name') || '').trim();
      if (!holderId && newName) holderId = (await data.saveHolder({ name: newName, holder_type: fd.get('h_new_type') || null,
        contact_name: fd.get('h_new_contact') || null, phone: fd.get('h_new_phone') || null })).id;
      if (holderId) await data.saveHolding({ id: holding.id, asset_id: saved.id, holder_id: holderId,
        holding_method: fd.get('h_holding_method'), agreement_status: fd.get('h_agreement_status'),
        start_date: fd.get('h_start_date'), end_date: fd.get('h_end_date'), use_detail: row.use_detail });
      else if (holding.id) await data.deleteHolding(holding.id);
      ui.toast('הנכס נשמר');
      location.href = `asset.html?id=${encodeURIComponent(saved.id)}`;
    } catch (err) { ui.toast(err.message, 'err'); btn.disabled = false; }
  });
})();
