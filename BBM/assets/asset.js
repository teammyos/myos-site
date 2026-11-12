(async function () {
  const { ui, data } = BBM;
  if (!(await ui.start({ base: '../', active: 'assets' }))) return;
  const esc = ui.esc, L = data.label, main = document.getElementById('main');

  function render() {
    const a = data.getAsset(ui.param('id'));
    if (!a) { main.innerHTML = '<div class="card error">הנכס לא נמצא. <a href="index.html">חזרה לרשימה</a></div>'; return; }
    document.title = `${a.asset_number} · ${a.name || 'נכס'} · BBM`;

    const row = (t, v, calc) => `<dt>${t}</dt><dd${calc ? ' class="calc"' : ''}>${v === '' || v == null ? '<span class="empty">—</span>' : v}</dd>`;
    const link = x => `<a href="asset.html?id=${encodeURIComponent(x.id)}">${esc(x.asset_number)} · ${esc(x.name || '')}</a>`;
    const edit = ui.canEdit();
    const yn = v => v === true ? 'כן' : v === false ? 'לא' : '';

    // שרשרת אבות לתצוגת עץ
    const chain = []; let p = a.parent;
    while (p && chain.length < 10) { chain.unshift(p); p = p.parent_asset_id ? data.getAsset(p.parent_asset_id) : null; }

    const k = a.considerations;
    const considerationHtml = k.length ? k.map(c => {
      const realized = c.id ? data.listAssets().filter(x => x.considerations.some(y => y.id === c.id && y.role === 'realized')) : [];
      const delivered = realized.reduce((s, x) => s + (Number(x.area_built) || 0), 0);
      return `<dl class="fields">
        ${row('מספר תהליך', esc(c.process_number))}
        ${row('תפקיד הנכס בתמורה', c.role === 'commitment' ? 'רשומת ההתחייבות' : 'נכס שמומש')}
        ${row('פרויקט / יזם', esc([c.project_name, c.developer].filter(Boolean).join(' · ')))}
        ${row('מספר בקשה', esc(c.request_number))}
        ${row('שלב', esc(L('consideration_stage', c.stage)))}
        ${row('שטח שהובטח', ui.fmtNum(c.promised_area) && ui.fmtNum(c.promised_area) + ' מ"ר')}
        ${row('שטח שנמסר', realized.length ? `${ui.fmtNum(delivered)} מ"ר <span class="calc-note">(מחושב מ-${realized.length} נכסים)</span>` : '', true)}
        ${row('התאמת שטחים', esc(L('area_match', c.area_match)))}
        ${row('היתר', c.has_permit ? 'יש' + (c.permit_date ? ' · ' + ui.fmtDate(c.permit_date) : '') : c.has_permit === false ? 'אין' : '')}
        ${row('טופס 4', c.has_form4 ? 'יש' + (c.form4_date ? ' · ' + ui.fmtDate(c.form4_date) : '') : c.has_form4 === false ? 'אין' : '')}
        ${row('מסירה וחזקה', esc(c.handover_status))}
        ${row('פרסום 77', esc(c.publication_77))}
        ${row('היזם בונה את השטח', yn(c.developer_builds))}
        ${row('תאימות שטחים', [['40% מקומה א\'', c.area_floor40], ['החלטת ועדה', c.area_committee], ['היתר', c.permit_area], ['התחייבות', c.area_commitment]]
            .filter(x => x[1] != null).map(x => `${x[0]}: ${ui.fmtNum(x[1])} מ"ר`).join(' · ') + (c.area_match_note ? `<br><span class="hint" style="white-space:pre-wrap">${esc(c.area_match_note)}</span>` : ''))}
        ${row('ייפוי כוח', yn(c.power_of_attorney))}
        ${row('הערת אזהרה (סעיף 126)', yn(c.section_126))}
        ${row('הפקעה', esc(c.expropriation_note))}
        ${row('פעולה נדרשת', c.required_action ? `<span style="white-space:pre-wrap">${esc(c.required_action)}</span>` : '')}
        ${row('שימוש לפי האקסל', c.actual_use ? `<span style="white-space:pre-wrap">${esc(c.actual_use)}</span>` : '')}
        ${row('הערות התהליך', c.notes ? `<span style="white-space:pre-wrap">${esc(c.notes)}</span>` : '')}
      </dl>
      ${realized.length && c.role === 'commitment' ? '<h2 style="margin-top:14px">נכסים שמומשו מהתמורה</h2><ul class="links">' + realized.map(x => `<li>${link(x)} · ${ui.fmtNum(x.area_built)} מ"ר</li>`).join('') + '</ul>' : ''}`;
    }).join('<hr>') : '<p class="empty">הנכס אינו מקושר לתמורה ציבורית</p>';

    const holdingsHtml = a.holdings.length ? `<ul class="links">${a.holdings.map(h => `<li>
        <strong>${esc(h.holder ? h.holder.name : '')}</strong> <span class="tag">${esc(L('holder_type', h.holder && h.holder.holder_type))}</span><br>
        ${esc(L('holding_method', h.holding_method))}${h.use_detail ? ' · ' + esc(L('use_detail', h.use_detail)) : ''}
        ${h.start_date || h.end_date ? ' · ' + ui.fmtDate(h.start_date) + ' – ' + ui.fmtDate(h.end_date) : ''}
        ${h.agreement_status ? ' · הסכם: ' + esc(L('agreement_status', h.agreement_status)) : ''}
        ${h.holder && (h.holder.contact_name || h.holder.phone) ? `<br><span class="hint">איש קשר: ${esc([h.holder.contact_name, h.holder.phone].filter(Boolean).join(' · '))}</span>` : ''}
      </li>`).join('')}</ul>` : '<p class="empty">אין מחזיק רשום</p>';

    main.innerHTML = `
      <p><a href="index.html">→ חזרה לרשימת הנכסים</a></p>
      <div class="page-head">
        <div>
          <h1>${esc(a.asset_number)} · ${esc(a.name || '')}</h1>
          <p class="sub">${esc(a.address)} &nbsp;
            <span class="tag ${a.record_status}">${esc(L('record_status', a.record_status))}</span>
            ${a.operational_status ? `<span class="tag ${['trespass', 'vacant', 'unused'].includes(a.operational_status) ? 'warn' : ''}">${esc(L('operational_status', a.operational_status))}</span>` : ''}
            ${a.realization_status && a.realization_status !== 'not_relevant' ? `<span class="tag">${esc(L('realization_status', a.realization_status))}</span>` : ''}
          </p>
        </div>
        <div class="actions">
          ${edit ? `<a class="btn primary" href="edit.html?id=${encodeURIComponent(a.id)}">עריכה</a>
          <a class="btn" href="edit.html?parent=${encodeURIComponent(a.id)}">+ נכס משנה</a>
          <button class="danger" id="delBtn" type="button">ביטול נכס</button>` : ''}
        </div>
      </div>

      <div class="grid2">
        <section class="card"><h2>זיהוי ומיקום</h2><dl class="fields">
          ${row('מספר נכס', esc(a.asset_number))}
          ${row('כתובת', esc(a.address) + (a.address_note && !String(a.address || '').includes(a.address_note) ? ` <span class="hint">(${esc(a.address_note)})</span>` : ''))}
          ${row('שכונה', esc(a.neighborhood))}
          ${row('קוד רחוב', esc(a.street_code))}
          ${row('ייעוד תכנוני', esc(a.planning_designation))}
          ${row('תכנית', esc(a.plan_number))}
          ${row('שם מוסד', esc(a.institution_name))}
          ${row('סמל מוסד', esc(a.institution_code))}
        </dl></section>

        <section class="card"><h2>סיווג</h2><dl class="fields">
          ${row('סוג פיזי', esc(L('physical_type', a.physical_type)))}
          ${row('מצב פיזי', esc(L('physical_condition', a.physical_condition)))}
          ${row('שטח בנוי', ui.fmtNum(a.area_built) && ui.fmtNum(a.area_built) + ' מ"ר')}
          ${row('שטח חצר', ui.fmtNum(a.area_yard) && ui.fmtNum(a.area_yard) + ' מ"ר')}
        </dl></section>

        <section class="card"><h2>גוש וחלקה</h2>
          ${a.parcels.length ? '<ul class="links">' + a.parcels.map(pc => {
            const others = data.listAssets({ gush: pc.gush, helka: pc.helka }).filter(x => x.id !== a.id);
            return `<li><strong>גוש ${esc(pc.gush)} · חלקה ${esc(pc.helka)}${pc.sub_helka ? ' · תת־חלקה ' + esc(pc.sub_helka) : ''}</strong>
              ${others.length ? `<br><span class="hint">נכסים נוספים בחלקה: ${others.map(link).join(' · ')}</span>` : ''}</li>`;
          }).join('') + '</ul>' : '<p class="empty">לא קושרו חלקות</p>'}
        </section>

        <section class="card"><h2>נכס אב ונכסי משנה</h2>
          ${chain.length || a.children.length ? `<ul class="links">
            ${chain.map((x, i) => `<li style="padding-inline-start:${i * 18}px">${link(x)}</li>`).join('')}
            <li style="padding-inline-start:${chain.length * 18}px"><strong>${esc(a.asset_number)} · ${esc(a.name || '')}</strong> (נכס זה)</li>
            ${a.children.map(x => `<li style="padding-inline-start:${(chain.length + 1) * 18}px">${link(x)}</li>`).join('')}
          </ul>` : '<p class="empty">נכס עצמאי – ללא נכס אב וללא נכסי משנה</p>'}
          ${a.complex ? `<p style="margin-top:12px"><strong>מתחם:</strong> ${esc(a.complex.complex_number || '')} · ${esc(a.complex.name)}</p>` : ''}
        </section>

        <section class="card"><h2>זכויות</h2><dl class="fields">
          ${row('סוג הזכות', esc(L('right_type', a.right_type)))}
          ${row('מקור הזכות', esc(L('right_source', a.right_source)))}
        </dl></section>

        <section class="card"><h2>שימוש ומטרת החזקה</h2><dl class="fields">
          ${row('מטרת החזקה', esc(L('holding_purpose', a.holding_purpose)))}
          ${row('תחום שימוש', esc(L('use_domain', a.use_domain)))}
          ${row('שימוש מפורט', esc(L('use_detail', a.use_detail)))}
        </dl></section>

        <section class="card"><h2>מחזיקים${a.is_commercial ? ' · נכס מניב' : ''}</h2>${holdingsHtml}</section>

        <section class="card"><h2>תמורה ציבורית</h2>${considerationHtml}</section>

        <section class="card"><h2>מסמכים</h2>
          ${a.folder_path ? `<div class="path"><code>${esc(a.folder_path)}</code><button type="button" id="copyPath">העתק נתיב</button></div>
          <p class="hint">המסמכים שמורים בתיקייה המקומית של העירייה. מעתיקים את הנתיב ומדביקים בסייר הקבצים.</p>`
          : '<p class="empty">לא הוגדר נתיב לתיקיית מסמכים</p>'}
        </section>

        <section class="card"><h2>הערות</h2>${a.notes ? `<p style="white-space:pre-wrap;margin:0">${esc(a.notes)}</p>` : '<p class="empty">אין הערות</p>'}</section>
      </div>
      <p class="hint">מקום שמור בשלבים הבאים: ביקורות, היסטוריית שינויים.</p>
      ${a.import_source_row ? `<p class="hint">מקור ייבוא: ${esc(a.import_source_file || '')} · גיליון ${esc(a.import_source_sheet || '')} · שורה ${esc(a.import_source_row)}</p>` : ''}`;

    const cp = document.getElementById('copyPath');
    if (cp) cp.onclick = () => navigator.clipboard.writeText(a.folder_path).then(() => ui.toast('הנתיב הועתק'));
    const del = document.getElementById('delBtn');
    if (del) del.onclick = async () => {
      if (!confirm('לבטל את הנכס? הרשומה לא נמחקת, אלא מסומנת כמבוטלת ולא תופיע ברשימה.')) return;
      try { await data.softDeleteAsset(a.id); location.href = 'index.html'; } catch (e) { ui.toast(e.message, 'err'); }
    };
  }
  render();
})();
