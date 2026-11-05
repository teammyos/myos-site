(async function () {
  const { ui, data } = BBM;
  if (!(await ui.start({ base: '../', active: 'assets' }))) return;
  const { esc, label } = { esc: ui.esc, label: data.label };
  const form = document.getElementById('filters');

  // רשימות בחירה למסננים
  form.querySelectorAll('[data-select]').forEach(span => {
    const list = span.dataset.select;
    span.outerHTML = ui.selectHtml(list, list, '', { empty: 'הכול' });
  });
  document.getElementById('holderSel').insertAdjacentHTML('beforeend',
    data.holders().map(h => `<option value="${esc(h.id)}">${esc(h.name)}</option>`).join(''));
  document.getElementById('complexSel').insertAdjacentHTML('beforeend',
    data.complexes().map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join(''));
  if (!ui.canEdit()) document.getElementById('newBtn').hidden = true;

  // עמודות – אותן עמודות משמשות לטבלה ולייצוא
  const columns = [
    { title: 'מספר נכס', value: a => a.asset_number, html: a => `<a href="asset.html?id=${encodeURIComponent(a.id)}">${esc(a.asset_number)}</a>`, cls: 'num' },
    { title: 'שם / תיאור', value: a => a.name },
    { title: 'כתובת', value: a => a.address },
    { title: 'גוש/חלקה', value: a => a.parcels_text, cls: 'num' },
    { title: 'סוג פיזי', value: a => label('physical_type', a.physical_type) },
    { title: 'קיים/עתידי', value: a => label('record_status', a.record_status),
      html: a => `<span class="tag ${a.record_status}">${esc(label('record_status', a.record_status))}</span>` },
    { title: 'מקור הזכות', value: a => label('right_source', a.right_source) },
    { title: 'מטרת החזקה', value: a => label('holding_purpose', a.holding_purpose) },
    { title: 'שימוש', value: a => label('use_detail', a.use_detail) || label('use_domain', a.use_domain) },
    { title: 'מחזיק', value: a => a.holder_name },
    { title: 'מצב תפעולי', value: a => label('operational_status', a.operational_status) },
    { title: 'שלב תמורה', value: a => label('consideration_stage', a.consideration_stage) },
    { title: 'עודכן', value: a => ui.fmtDate(a.updated_at), cls: 'num' }
  ];

  let rows = [];
  function filtersFromForm() {
    const f = {}; new FormData(form).forEach((v, k) => { if (v) f[k] = v; }); return f;
  }
  function render() {
    const f = filtersFromForm();
    rows = data.listAssets(f);
    const total = data.listAssets().length;
    document.getElementById('count').textContent = rows.length === total ? `${total} נכסים` : `${rows.length} מתוך ${total} נכסים`;
    const head = '<thead><tr>' + columns.map(c => `<th scope="col">${c.title}</th>`).join('') + '</tr></thead>';
    const body = rows.length
      ? rows.map(a => '<tr>' + columns.map(c => `<td class="${c.cls || ''}">${c.html ? c.html(a) : esc(c.value(a))}</td>`).join('') + '</tr>').join('')
      : `<tr><td colspan="${columns.length}" class="empty">לא נמצאו נכסים לפי הסינון</td></tr>`;
    document.getElementById('table').innerHTML = head + '<tbody>' + body + '</tbody>';
    // שומר את הסינון בכתובת, כדי שאפשר לשתף קישור לרשימה מסוננת
    history.replaceState(null, '', '?' + new URLSearchParams(f).toString());
  }

  // טעינת סינון מהכתובת
  new URLSearchParams(location.search).forEach((v, k) => { if (form.elements[k]) form.elements[k].value = v; });
  form.addEventListener('input', render);
  form.addEventListener('reset', () => setTimeout(render));
  form.addEventListener('submit', e => e.preventDefault());

  document.getElementById('exportBtn').onclick = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    ui.download(`נכסים-${stamp}.csv`, data.toCsv(rows, columns));  // כל התוצאות המסוננות
  };
  render();
})();
