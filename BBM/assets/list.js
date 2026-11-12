(async function () {
  const { ui, data } = BBM;
  if (!(await ui.start({ base: '../', active: 'assets' }))) return;
  const esc = ui.esc, label = data.label;
  const form = document.getElementById('filters');
  const results = document.getElementById('results');

  // ---------- רשימות בחירה למסננים ----------
  form.querySelectorAll('[data-select]').forEach(span => {
    const list = span.dataset.select;
    span.outerHTML = ui.selectHtml(list, list, '', { empty: 'הכול' });
  });
  document.getElementById('holderSel').insertAdjacentHTML('beforeend',
    data.holders().map(h => `<option value="${esc(h.id)}">${esc(h.name)}</option>`).join(''));
  document.getElementById('complexSel').insertAdjacentHTML('beforeend',
    data.complexes().map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join(''));
  if (!ui.canEdit()) document.getElementById('newBtn').hidden = true;

  // ---------- תצוגה (כרטיסיות / טבלה) – נשמרת לכל צופה בדפדפן ----------
  let view = 'cards';
  try { view = localStorage.getItem('bbm_assets_view') || 'cards'; } catch (e) { /* אין אחסון – ברירת מחדל */ }
  function setView(v) {
    view = v;
    try { localStorage.setItem('bbm_assets_view', v); } catch (e) { /* לא חובה */ }
    document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
    render();
  }
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => setView(b.dataset.view));

  // ---------- עזרים ----------
  const known = v => v && v !== 'unknown';
  const firstCons = a => a.considerations[0] || null;
  const useText = a => (a.use_detail && label('use_detail', a.use_detail)) || (known(a.use_domain) ? label('use_domain', a.use_domain) : '');
  const placeText = a => [a.address, a.address_note ? `(${a.address_note})` : ''].filter(Boolean).join(' ');
  const yn = v => v === true ? '✓' : v === false ? '✗' : '?';
  const area = a => [a.area_built != null ? `${ui.fmtNum(a.area_built)} מ"ר` : '', a.area_yard ? `חצר ${ui.fmtNum(a.area_yard)}` : ''].filter(Boolean).join(' · ');
  const actionOf = a => a.considerations.map(c => c.required_action).filter(Boolean).join('\n');
  const STATUS_CLS = { active: 'ok', under_construction: 'info', trespass: 'bad', unused: 'warn', vacant: 'warn', third_party: 'info' };

  // ---------- היקף: הכול / תמורות / אחרים ----------
  const SCOPES = [['', 'הכול'], ['pc', 'תמורות ציבוריות'], ['other', 'נכסים אחרים']];
  const inScope = (a, s) => !s || (s === 'pc' ? a.right_source === 'public_consideration' : a.right_source !== 'public_consideration');
  const chips = document.getElementById('scopeChips');
  chips.addEventListener('click', e => {
    const b = e.target.closest('[data-scope]'); if (!b) return;
    form.elements.scope.value = b.dataset.scope; render();
  });

  // ---------- קיבוץ ----------
  const STAGE_ORDER = ['construction', 'commitment', 'permit', 'form4', 'delivered', 'unknown', ''];
  const GROUPS = {
    stage: { key: a => a.consideration_stage || '', name: k => k ? label('consideration_stage', k) : 'ללא תהליך תמורה', order: STAGE_ORDER },
    operational_status: { key: a => a.operational_status || 'unknown', name: k => label('operational_status', k) || 'לא ידוע',
      order: ['trespass', 'unused', 'vacant', 'under_construction', 'third_party', 'active', 'renovation', 'unknown'] },
    use_domain: { key: a => a.use_domain || 'unknown', name: k => label('use_domain', k) || 'לא ידוע' },
    neighborhood: { key: a => a.neighborhood || '', name: k => k || 'ללא שכונה' },
  };

  // ---------- עמודות הטבלה והייצוא ----------
  const columns = [
    { title: 'מספר נכס', value: a => a.asset_number, cls: 'num',
      html: a => `<a href="asset.html?id=${encodeURIComponent(a.id)}">${esc(a.asset_number)}</a> <a class="folder-btn" href="bbmasset:${encodeURIComponent(a.asset_number)}" title="פתיחת תיקיית הנכס" aria-label="פתיחת תיקיית נכס ${esc(a.asset_number)}">📂</a>` },
    { title: 'כתובת', value: a => placeText(a) },
    { title: 'שכונה', value: a => a.neighborhood },
    { title: 'שימוש', value: a => useText(a) },
    { title: 'מצב תפעולי', value: a => label('operational_status', a.operational_status) },
    { title: 'שלב תמורה', value: a => label('consideration_stage', a.consideration_stage) },
    { title: 'יזם', value: a => (firstCons(a) || {}).developer },
    { title: 'גוש/חלקה', value: a => a.parcels_text, cls: 'num' },
    { title: 'שטח בנוי', value: a => a.area_built, cls: 'num' },
    { title: 'חצר', value: a => a.area_yard, cls: 'num' },
    { title: 'סמל מוסד', value: a => a.institution_code, cls: 'num' },
    { title: 'קיים/עתידי', value: a => label('record_status', a.record_status) },
    { title: 'מקור הזכות', value: a => label('right_source', a.right_source) },
    { title: 'מחזיק', value: a => a.holder_name },
    { title: 'פעולה נדרשת', value: a => actionOf(a) },
  ];

  // ---------- כרטיסייה ----------
  function card(a) {
    const c = firstCons(a);
    const st = a.operational_status;
    const kv = [
      ['שכונה', a.neighborhood],
      ['גוש/חלקה', a.parcels_text],
      ['שטח', area(a)],
      ['יזם', c && c.developer ? c.developer.split('\n')[0] : ''],
      ['רישוי', c ? `היתר ${yn(c.has_permit)} · טופס 4 ${yn(c.has_form4)}` : ''],
      ['סמל מוסד', a.institution_code],
      ['מחזיק', a.holder_name],
    ].filter(([, v]) => v);
    const act = actionOf(a);
    const href = `asset.html?id=${encodeURIComponent(a.id)}`;
    return `<div class="acard" data-href="${href}">
      <div class="acard-top">
        <span class="acard-id"><a class="acard-num" href="${href}">נכס ${esc(a.asset_number)}</a>
          <a class="folder-btn" href="bbmasset:${encodeURIComponent(a.asset_number)}" title="פתיחת תיקיית הנכס במחשב (עירייה)" aria-label="פתיחת תיקיית נכס ${esc(a.asset_number)}">📂</a></span>
        <span class="pills">
          ${known(st) ? `<span class="pill ${STATUS_CLS[st] || ''}">${esc(label('operational_status', st))}</span>` : ''}
          ${a.record_status === 'future' ? '<span class="pill future">עתידי</span>' : ''}
        </span>
      </div>
      <div class="acard-title">${esc(placeText(a) || a.name || '')}${useText(a) ? ` <span class="sep">—</span> ${esc(useText(a))}` : ''}</div>
      ${kv.length ? `<dl class="acard-kv">${kv.map(([k, v]) => `<div><dt>${k}:</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
      ${act ? `<div class="acard-note">⚑ ${esc(act.split('\n')[0])}${act.includes('\n') ? ' …' : ''}</div>` : ''}
    </div>`;
  }

  // ---------- סינון ----------
  function filtersFromForm() {
    const f = {}; new FormData(form).forEach((v, k) => { if (v) f[k] = v; }); return f;
  }
  const norm = s => (s || '').toString().toLowerCase().replace(/["'״׳]/g, '');
  function filtered(f) {
    const base = data.listAssets({ ...f, q: '' });
    const q = norm(f.q).trim();
    return base.filter(a => {
      if (f.action && !actionOf(a)) return false;
      if (!q) return true;
      const c = firstCons(a) || {};
      const hay = norm([a.asset_number, a.name, a.address, a.address_note, a.neighborhood, a.institution_code, a.institution_name,
        a.parcels_text, a.holder_name, c.developer, c.request_number, a.street_code].join(' '));
      return q.split(/\s+/).every(w => hay.includes(w));
    });
  }

  let rows = [];
  function render() {
    const f = filtersFromForm();
    const all = filtered({ ...f, scope: '' });
    rows = all.filter(a => inScope(a, f.scope));
    const total = data.listAssets().length;

    chips.innerHTML = SCOPES.map(([s, t]) => `<button type="button" class="chip" data-scope="${s}" aria-pressed="${(f.scope || '') === s}">
      ${t} <span class="n">${all.filter(a => inScope(a, s)).length}</span></button>`).join('');
    document.getElementById('count').textContent = rows.length === total ? `${total} נכסים` : `${rows.length} מתוך ${total} נכסים`;
    document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));

    if (!rows.length) { results.innerHTML = '<div class="card empty">לא נמצאו נכסים לפי החיפוש והסינון</div>'; }
    else if (view === 'table') {
      const head = '<thead><tr>' + columns.map(c => `<th scope="col">${c.title}</th>`).join('') + '</tr></thead>';
      const body = rows.map(a => `<tr data-href="asset.html?id=${encodeURIComponent(a.id)}">` + columns.map(c => `<td class="${c.cls || ''}">${c.html ? c.html(a) : esc(c.value(a) ?? '')}</td>`).join('') + '</tr>').join('');
      results.innerHTML = `<div class="table-wrap"><table class="data clickable">${head}<tbody>${body}</tbody></table></div>`;
    } else {
      const g = GROUPS[f.group || 'stage'];
      if (!g) { results.innerHTML = `<div class="cards">${rows.map(card).join('')}</div>`; }
      else {
        const map = new Map();
        rows.forEach(a => { const k = g.key(a); if (!map.has(k)) map.set(k, []); map.get(k).push(a); });
        const keys = [...map.keys()].sort((x, y) => {
          const o = g.order || [];
          const ix = o.indexOf(x), iy = o.indexOf(y);
          if (ix !== iy) return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy);
          return String(g.name(x)).localeCompare(String(g.name(y)), 'he');
        });
        results.innerHTML = keys.map(k => `<details class="group" open>
          <summary><span class="dot"></span>${esc(g.name(k))} <span class="n">${map.get(k).length}</span></summary>
          <div class="cards">${map.get(k).map(card).join('')}</div></details>`).join('');
      }
    }
    // שומר את הסינון בכתובת, כדי שאפשר לשתף קישור לרשימה מסוננת
    history.replaceState(null, '', '?' + new URLSearchParams(f).toString());
  }

  // לחיצה בכל מקום על כרטיסייה / שורה פותחת את הנכס (חוץ מקישורים בתוכה, כמו כפתור התיקייה)
  results.addEventListener('click', e => {
    if (e.target.closest('a')) return;
    const el = e.target.closest('[data-href]');
    if (!el) return;
    if (e.ctrlKey || e.metaKey) window.open(el.dataset.href, '_blank'); else location.href = el.dataset.href;
  });

  // טעינת סינון מהכתובת
  new URLSearchParams(location.search).forEach((v, k) => {
    const el = form.elements[k]; if (!el) return;
    if (el.type === 'checkbox') el.checked = v === el.value; else el.value = v;
    if (!['q', 'scope', 'group'].includes(k)) document.getElementById('more').open = true;
  });
  form.addEventListener('input', render);
  form.addEventListener('reset', () => setTimeout(render));
  form.addEventListener('submit', e => e.preventDefault());

  document.getElementById('exportBtn').onclick = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    ui.download(`נכסים-${stamp}.csv`, data.toCsv(rows, columns));  // כל התוצאות המסוננות
  };
  render();
})();
