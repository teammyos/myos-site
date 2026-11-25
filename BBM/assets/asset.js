(async function () {
  const { ui, data } = BBM;
  if (!(await ui.start({ base: '../', active: 'assets' }))) return;
  const esc = ui.esc, L = data.label, main = document.getElementById('main');

  let dirty = false;
  window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  // E = מצב עריכה: אותה תצוגה בדיוק, והשדות הופכים לתיבות עריכה
  function render(E = false) {
    dirty = false; document.body.classList.toggle('asset-editing', E);
    const a = data.getAsset(ui.param('id'));
    if (!a) { main.innerHTML = `<div class="card error">הנכס לא נמצא. <a href="${ui.listUrl('../')}">חזרה לרשימה</a></div>`; return; }
    document.title = `${a.asset_number} · ${a.title || 'נכס'} · BBM`;

    const row = (t, v, calc) => `<dt>${t}</dt><dd${calc ? ' class="calc"' : ''}>${v === '' || v == null ? '<span class="empty">—</span>' : v}</dd>`;
    const link = x => `<a href="asset.html?id=${encodeURIComponent(x.id)}">${esc(x.asset_number)} · ${esc(x.title || data.displayName(x))}</a>`;
    const edit = ui.canEdit();
    // עוזרי עריכה: בתצוגה מחזירים את הערך, בעריכה – תיבה עם אותו שם שדה
    const val = key => esc(a[key] == null ? '' : a[key]);
    const inp = (key, view, type = 'text', extra = '') => E ? `<input name="${key}" type="${type}" value="${val(key)}" ${extra}>` : view;
    const pick = (key, list, view) => E ? ui.selectHtml(key, list, a[key]) : view;
    const holding = a.current_holding || {};
    const hval = key => esc(holding[key] == null ? '' : holding[key]);
    const yn = v => v === true ? 'כן' : v === false ? 'לא' : '';

    // שרשרת אבות לתצוגת עץ
    const chain = []; let p = a.parent;
    while (p && chain.length < 10) { chain.unshift(p); p = p.parent_asset_id ? data.getAsset(p.parent_asset_id) : null; }

    const k = a.considerations;
    const considerationHtml = k.length ? k.map(c => {
      const realized = c.id ? data.listAssets().filter(x => x.considerations.some(y => y.id === c.id && y.role === 'realized')) : [];
      const delivered = realized.reduce((s, x) => s + (Number(x.area_built) || 0), 0);
      const shared = c.id ? data.listAssets().filter(x => x.id !== a.id && x.considerations.some(y => y.id === c.id)) : [];
      return `${edit && !E && c.id ? `<p><a class="btn primary" href="consideration.html?id=${encodeURIComponent(c.id)}&asset=${encodeURIComponent(a.id)}">עריכת התמורה</a></p>` : ''}
      ${shared.length ? `<p class="hint">הבקשה משותפת גם לנכסים: ${shared.map(link).join(' · ')}</p>` : ''}
      <dl class="fields">
        ${row('תפקיד הנכס בתמורה', c.role === 'commitment' ? 'רשומת ההתחייבות' : 'נכס שמומש')}
        ${row('מספר בקשה להיתר', esc(c.request_number))}
        ${row('כתובת הבקשה', esc(c.project_name))}
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
        ${row('הערות', c.notes ? `<span style="white-space:pre-wrap">${esc(c.notes)}</span>` : '')}
      </dl>
      ${realized.length && c.role === 'commitment' ? '<h2 style="margin-top:14px">נכסים שמומשו מהתמורה</h2><ul class="links">' + realized.map(x => `<li>${link(x)} · ${ui.fmtNum(x.area_built)} מ"ר</li>`).join('') + '</ul>' : ''}`;
    }).join('<hr>') : '<p class="empty">הנכס אינו מקושר לתמורה ציבורית</p>';

    const CS = { valid: ['בתוקף', 'ok'], soon: ['עומד לפוג', 'warn'], expired: ['פג תוקף', 'bad'], none: ['אין חוזה', 'bad'] };
    const money = v => v == null ? '' : `${ui.fmtNum(v)} ₪`;
    const holdingItem = (h, isCurrent) => {
      const cs = isCurrent ? CS[a.contract_status] : null;
      return `<li>
        <strong>${h.holder ? `<a href="../contacts.html?id=${encodeURIComponent(h.holder.id)}" title="לכרטיס איש הקשר">${esc(h.holder.name)}</a>` : ''}</strong> ${h.holder && h.holder.holder_type ? `<span class="tag">${esc(L('holder_type', h.holder.holder_type))}</span>` : ''}
        ${cs ? `<span class="pill ${cs[1]}">חוזה: ${cs[0]}</span>` : ''}<br>
        ${[esc(L('holding_method', h.holding_method)),
           h.monthly_fee != null ? `דמי שימוש: <strong>${money(h.monthly_fee)}</strong> לחודש${h.vat_applies === true ? ' + מע"מ' : h.vat_applies === false ? ' (מגורים, בלי מע"מ)' : ''}` : '',
           h.contract_end ? `חוזה עד ${ui.fmtDate(h.contract_end)}` : (h.agreement_status ? 'הסכם: ' + esc(L('agreement_status', h.agreement_status)) : ''),
           h.start_date || h.end_date ? `תקופה: ${h.start_date ? ui.fmtDate(h.start_date) : '?'} – ${h.end_date ? ui.fmtDate(h.end_date) : 'היום'}` : ''].filter(Boolean).join(' · ')}
        ${h.balance_snapshot != null ? `<br>${h.balance_snapshot > 0 ? `<span class="pill bad">יתרת חוב ${money(h.balance_snapshot)}</span>` : h.balance_snapshot < 0 ? `<span class="pill ok">יתרת זכות ${money(-h.balance_snapshot)}</span>` : '<span class="pill ok">אין חוב</span>'}
          <span class="hint">נכון ל-${ui.fmtDate(h.balance_snapshot_date)}, לפי קובץ חברת הניהול</span>` : ''}
        ${h.holder && (h.holder.contact_name || h.holder.phone || h.holder.email) ? `<br><span class="hint">איש קשר: ${esc([h.holder.contact_name, h.holder.phone, h.holder.email].filter(Boolean).join(' · '))}</span>` : ''}
        ${h.notes ? `<br><span class="hint">${esc(h.notes)}</span>` : ''}
      </li>`;
    };
    const holdingsHtml = (a.current_holding ? `<ul class="links">${holdingItem(a.current_holding, true)}</ul>` : '<p class="empty">אין מחזיק נוכחי</p>')
      + (a.managed_by ? `<p class="hint">הנכס מנוהל בידי: ${esc(a.managed_by)}</p>` : '')
      + (a.past_holdings.length ? `<details class="more"><summary>מחזיקים קודמים (${a.past_holdings.length})</summary><ul class="links">${a.past_holdings.map(h => holdingItem(h, false)).join('')}</ul></details>` : '');

    // ביקורות של תהליכי התמורה של הנכס (ביקורת שיובאה עם "נכס אחר" בהערה לא מוצגת כאן)
    const allCons = data.listConsiderations();
    const surveys = k.flatMap(c => ((allCons.find(x => x.id === c.id) || {}).surveys || []))
      .filter(sv => { const m = /^נכס (\S+)/.exec(sv.notes || ''); return !m || m[1] === String(a.asset_number); });
    const surveysHtml = surveys.length ? `<ul class="links">${surveys.map(sv => `<li>
        <strong>${sv.survey_date ? ui.fmtDate(sv.survey_date) : 'ללא תאריך'}</strong>${sv.current_use ? ' · ' + esc(sv.current_use) : ''}
        ${sv.notes ? `<br><span style="white-space:pre-wrap">${esc(sv.notes)}</span>` : ''}</li>`).join('')}</ul>`
      : '<p class="empty">לא נרשמו ביקורות לנכס</p>';

    // שורת סיכום לכותרת המקופלת של התמורה: שלב · היתר · טופס 4
    const mark = v => v === true ? '✓' : v === false ? '✗' : '?';
    const consSummary = k.map(c => [L('consideration_stage', c.stage), `היתר ${mark(c.has_permit)}`, `טופס 4 ${mark(c.has_form4)}`,
      c.request_number ? `בקשה ${esc(c.request_number)}` : ''].filter(Boolean).map(t => `<span class="pill">${t}</span>`).join('')).join(' ');

    // לשוניות הכרטיס
    const TABS = [['main', 'ראשי'], ['rights', 'זכויות וחלקות'], ['holders', 'מחזיקים', a.holdings.length], ['surveys', 'ביקורות', surveys.length],
      ['proc', 'תהליכים', a.open_processes.length]];

    // ----- הערות (מי ומתי נרשמים אוטומטית) -----
    const canNote = ui.canEditLimited() && !E, isAdmin = BBM.me && BBM.me.role === 'admin';
    const when = d => d ? new Date(d).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' }) : '';
    const notesHtml = `
      ${canNote ? `<form id="noteForm" class="inline-form">
          <label class="f">הערה חדשה<textarea name="body" rows="3" maxlength="5000" required placeholder="מה קרה, מה סוכם, מה צריך לזכור"></textarea></label>
          <p><button class="primary" type="submit">הוספת הערה</button> <span class="hint">השם שלך והתאריך נרשמים אוטומטית.</span></p>
        </form>` : ''}
      ${a.asset_notes.length ? a.asset_notes.map(n => `<article class="log-item" data-note="${esc(n.id)}">
          <div class="log-head"><strong>${esc(n.created_by_name || 'לא ידוע')}</strong><span class="log-when">${when(n.created_at)}</span></div>
          <div class="log-body">${esc(n.body)}</div>
          ${!E && (isAdmin || (BBM.me && n.created_by === BBM.me.id)) ? '<div class="log-foot"><button type="button" class="link" data-del-note>מחיקה</button></div>' : ''}
        </article>`).join('') : '<p class="empty">עוד לא נרשמו הערות לנכס</p>'}`;

    // ----- תהליכים: פעיל / ממתין / נסגר -----
    const PST = { active: 'warn', pending: 'info', closed: 'ok' };
    const procItem = p => `<article class="log-item" data-proc="${esc(p.id)}">
        <div class="log-head"><span><strong>${esc(data.processTypeLabel(p.process_type))}</strong> <span class="pill ${PST[p.status] || ''}">${esc(data.processStatusLabel(p.status))}</span></span>
          ${canNote ? `<span class="proc-actions"><select data-status aria-label="סטטוס התהליך">${data.PROCESS_STATUS.map(([v, t]) => `<option value="${v}"${v === p.status ? ' selected' : ''}>${t}</option>`).join('')}</select>
            ${isAdmin ? '<button type="button" class="link" data-del-proc>מחיקה</button>' : ''}</span>` : ''}</div>
        ${p.description ? `<div class="log-body">${esc(p.description)}</div>` : ''}
        <div class="hint">נפתח: ${esc(p.opened_by_name || 'לא ידוע')} · ${when(p.opened_at)}${p.status_at ? ` · סטטוס עודכן: ${esc(p.status_by_name || '')} · ${when(p.status_at)}` : ''}${p.closed_at ? ` · נסגר ${when(p.closed_at)}` : ''}</div>
      </article>`;
    const openP = a.processes.filter(p => p.status !== 'closed'), closedP = a.processes.filter(p => p.status === 'closed');
    const procHtml = `
      ${canNote ? `<form id="procForm" class="inline-form">
          <div class="proc-new">
            <label class="f">סוג התהליך<select name="process_type" required><option value="">— בחר —</option>${data.PROCESS_TYPES.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label>
            <label class="f">סטטוס<select name="status">${data.PROCESS_STATUS.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label>
            <label class="f grow">פירוט<input name="description" maxlength="1000" placeholder="למשל: הוגשה תביעת פינוי, ממתין לדיון"></label>
          </div>
          <p><button class="primary" type="submit">פתיחת תהליך</button> <span class="hint">השם שלך ותאריך הפתיחה נרשמים אוטומטית.</span></p>
        </form>` : ''}
      ${openP.length ? openP.map(procItem).join('') : '<p class="empty">אין תהליכים פתוחים בנכס</p>'}
      ${closedP.length ? `<details class="more"><summary>תהליכים שנסגרו (${closedP.length})</summary>${closedP.map(procItem).join('')}</details>` : ''}`;

    main.innerHTML = `
      <p><a href="${ui.listUrl('../')}">→ חזרה לרשימת הנכסים</a></p>
      <div class="page-head">
        <div>
          <h1>${esc(a.asset_number)} · ${esc(a.title || '')}</h1>
          <p class="sub">${esc(a.address)} &nbsp;
            ${a.record_status === 'future' ? '<span class="pill future">עתידי</span>' : ''}
            ${a.operational_status ? `<span class="tag ${['trespass', 'vacant', 'unused'].includes(a.operational_status) ? 'warn' : ''}">${esc(L('operational_status', a.operational_status))}</span>` : ''}
            ${a.realization_status && a.realization_status !== 'not_relevant' ? `<span class="tag">${esc(L('realization_status', a.realization_status))}</span>` : ''}
          </p>
        </div>
        <div class="actions">
          ${E ? '' : `<a class="btn" href="bbmasset:${encodeURIComponent(a.asset_number)}" title="פתיחת תיקיית הנכס במחשב (עירייה)">📂 תיקייה</a>
          ${edit ? `<button class="primary" id="editBtn" type="button">✎ עריכה</button>
          <a class="btn" href="edit.html?parent=${encodeURIComponent(a.id)}">+ נכס משנה</a>
          <button class="danger" id="delBtn" type="button">ביטול נכס</button>` : ''}`}
        </div>
      </div>
      ${E ? '<div class="edit-banner" role="status">✎ <strong>מצב עריכה.</strong> משנים את השדות בכל הלשוניות, ובסוף לוחצים "שמירה" למטה. עד אז שום דבר לא נשמר.</div>' : ''}

      <div class="tabs" role="tablist" aria-label="חלקי כרטיס הנכס">
        ${TABS.map(([id, t, n]) => `<button type="button" role="tab" id="tab-${id}" data-tab="${id}" aria-controls="panel-${id}">${t}${n ? ` <span class="n">${n}</span>` : ''}</button>`).join('')}
      </div>

      <div class="tabpanel grid2" role="tabpanel" id="panel-main" aria-labelledby="tab-main">
        <section class="card"><h2>זיהוי ומיקום</h2><dl class="fields">
          ${row('מספר נכס', esc(a.asset_number) + (E ? ' <span class="hint">(קבוע, לא ניתן לשינוי)</span>' : ''))}
          ${row('שם / תיאור', inp('name', esc(a.name), 'text', 'placeholder="למשל: גן ילדים של חני. בלי הכתובת"'))}
          ${E ? row('רחוב', inp('street')) + row('מספר בית', inp('house_number')) + row('הערת כתובת', inp('address_note', '', 'text', 'placeholder="למשל: בניין מס׳ 13"'))
              : row('כתובת', esc(a.address) + (a.address_note && !String(a.address || '').includes(a.address_note) ? ` <span class="hint">(${esc(a.address_note)})</span>` : ''))}
          ${row('גוש וחלקה', a.parcels.map(pc => `גוש ${esc(pc.gush)} · חלקה ${esc(pc.helka)}${pc.sub_helka ? ' · תת־חלקה ' + esc(pc.sub_helka) : ''}`).join('<br>') + (E ? '<br><span class="hint">נערך בלשונית "זכויות וחלקות"</span>' : ''))}
          ${row('שכונה', inp('neighborhood', esc(a.neighborhood)))}
          ${k.some(c => c.developer) ? row('יזם', k.map(c => esc(c.developer || '')).filter(Boolean).join('<br>') + (E ? '<br><span class="hint">נערך ב"עריכת התמורה"</span>' : '')) : ''}
        </dl></section>

        <section class="card"><h2>מצב</h2><dl class="fields">
          ${row('קיים / עתידי', pick('record_status', 'record_status', esc(L('record_status', a.record_status))))}
          ${row('מצב תפעולי', pick('operational_status', 'operational_status', esc(L('operational_status', a.operational_status))))}
          ${row('מצב מימוש', pick('realization_status', 'realization_status', esc(L('realization_status', a.realization_status))))}
          ${row('מצב פיזי', pick('physical_condition', 'physical_condition', esc(L('physical_condition', a.physical_condition))))}
        </dl></section>

        <section class="card"><h2>סיווג ושטחים</h2><dl class="fields">
          ${row('סוג פיזי', pick('physical_type', 'physical_type', esc(L('physical_type', a.physical_type))))}
          ${row('שטח בנוי' + (E ? ' (מ"ר)' : ''), inp('area_built', ui.fmtNum(a.area_built) && ui.fmtNum(a.area_built) + ' מ"ר', 'number', 'step="0.01" min="0"'))}
          ${row('שטח חצר' + (E ? ' (מ"ר)' : ''), inp('area_yard', ui.fmtNum(a.area_yard) && ui.fmtNum(a.area_yard) + ' מ"ר', 'number', 'step="0.01" min="0"'))}
        </dl></section>

        <section class="card"><h2>שימוש ומטרת החזקה</h2><dl class="fields">
          ${row('מטרת החזקה', pick('holding_purpose', 'holding_purpose', esc(L('holding_purpose', a.holding_purpose))))}
          ${row('תחום שימוש', pick('use_domain', 'use_domain', esc(L('use_domain', a.use_domain))))}
          ${row('שימוש מפורט', E ? '<span id="useDetailWrap"></span>' : esc(L('use_detail', a.use_detail)))}
        </dl></section>

        <section class="card"><h2>טקסט חופשי</h2>${E ? `<textarea name="notes" rows="5">${val('notes')}</textarea>` : a.notes ? `<p style="white-space:pre-wrap;margin:0">${esc(a.notes)}</p>` : '<p class="empty">אין טקסט</p>'}</section>
      </div>

      ${k.length ? `<details class="group cons-group" id="consBox">
        <summary><span class="dot"></span>נתוני תמורה ציבורית <span class="cons-sum">${consSummary}</span></summary>
        <section class="card">${considerationHtml}</section>
      </details>` : ''}

      <details class="group notes-group" id="notesBox" open>
        <summary><span class="dot"></span>הערות <span class="n">${a.asset_notes.length}</span></summary>
        <section class="card">${notesHtml}</section>
      </details>

      <div class="tabpanel grid2" role="tabpanel" id="panel-rights" aria-labelledby="tab-rights" hidden>
        <section class="card"><h2>זכויות</h2><dl class="fields">
          ${row('סוג הזכות', pick('right_type', 'right_type', esc(L('right_type', a.right_type))))}
          ${row('מקור הזכות', pick('right_source', 'right_source', esc(L('right_source', a.right_source))))}
        </dl></section>

        <section class="card"><h2>תכנון</h2><dl class="fields">
          ${row('ייעוד תכנוני', inp('planning_designation', esc(a.planning_designation), 'text', 'placeholder="למשל: שב״צ, שצ״פ, דרך"'))}
          ${row('תכנית', inp('plan_number', esc(a.plan_number)))}
        </dl></section>

        <section class="card"><h2>גוש וחלקה</h2>
          ${E ? '<div id="parcels"></div><button type="button" id="addParcel">+ הוספת חלקה</button>'
          : a.parcels.length ? '<ul class="links">' + a.parcels.map(pc => {
            const others = data.listAssets({ gush: pc.gush, helka: pc.helka }).filter(x => x.id !== a.id);
            return `<li><strong>גוש ${esc(pc.gush)} · חלקה ${esc(pc.helka)}${pc.sub_helka ? ' · תת־חלקה ' + esc(pc.sub_helka) : ''}</strong>
              ${others.length ? `<br><span class="hint">נכסים נוספים בחלקה: ${others.map(link).join(' · ')}</span>` : ''}</li>`;
          }).join('') + '</ul>' : '<p class="empty">לא קושרו חלקות</p>'}
        </section>

        <section class="card"><h2>נכס אב ונכסי משנה</h2>
          ${E ? (() => {
            const blocked = new Set([a.id, ...data.descendants(a.id)]);
            const po = data.allAssetsBrief().filter(x => !blocked.has(x.id))
              .sort((x, y) => String(x.asset_number).localeCompare(String(y.asset_number), 'he', { numeric: true }))
              .map(x => `<option value="${esc(x.id)}"${x.id === a.parent_asset_id ? ' selected' : ''}>${esc(x.asset_number)} · ${esc(x.name || '')}</option>`).join('');
            const co = data.complexes().map(c => `<option value="${esc(c.id)}"${c.id === a.complex_id ? ' selected' : ''}>${esc(c.complex_number || '')} · ${esc(c.name)}</option>`).join('');
            return `<dl class="fields">${row('נכס אב', `<select name="parent_asset_id"><option value="">— ללא נכס אב —</option>${po}</select>`)}
              ${row('מתחם', `<select name="complex_id"><option value="">— ללא מתחם —</option>${co}</select>`)}</dl>
              <p class="hint">נכס אב = הנכס הפיזי שהנכס נמצא בתוכו. שיתוף באותה חלקה אינו מצריך נכס אב.</p>`;
          })() : `${chain.length || a.children.length ? `<ul class="links">
            ${chain.map((x, i) => `<li style="padding-inline-start:${i * 18}px">${link(x)}</li>`).join('')}
            <li style="padding-inline-start:${chain.length * 18}px"><strong>${esc(a.asset_number)} · ${esc(a.title || '')}</strong> (נכס זה)</li>
            ${a.children.map(x => `<li style="padding-inline-start:${(chain.length + 1) * 18}px">${link(x)}</li>`).join('')}
          </ul>` : '<p class="empty">נכס עצמאי – ללא נכס אב וללא נכסי משנה</p>'}
          ${a.complex ? `<p style="margin-top:12px"><strong>מתחם:</strong> ${esc(a.complex.complex_number || '')} · ${esc(a.complex.name)}</p>` : ''}`}
        </section>
      </div>

      <div class="tabpanel" role="tabpanel" id="panel-holders" aria-labelledby="tab-holders" hidden>
        <section class="card"><h2>מחזיקים${a.is_commercial ? ' · נכס מניב' : ''}</h2>${E ? `<dl class="fields">
            ${row('מחזיק', `<select name="h_holder_id"><option value="">— ללא / מחזיק חדש —</option>${data.holders().map(h => `<option value="${esc(h.id)}"${h.id === holding.holder_id ? ' selected' : ''}>${esc(h.name)}</option>`).join('')}</select>`)}
            ${row('או מחזיק חדש – שם', '<input name="h_new_name">')}
            ${row('סוג (למחזיק חדש)', ui.selectHtml('h_new_type', 'holder_type', ''))}
            ${row('איש קשר (למחזיק חדש)', '<input name="h_new_contact">')}
            ${row('טלפון (למחזיק חדש)', '<input name="h_new_phone" inputmode="tel">')}
            ${row('אופן ההחזקה', ui.selectHtml('h_holding_method', 'holding_method', holding.holding_method))}
            ${row('מצב הסכם', ui.selectHtml('h_agreement_status', 'agreement_status', holding.agreement_status))}
            ${row('דמי שימוש לחודש, לפני מע"מ (₪)', `<input type="number" min="0" step="any" inputmode="decimal" name="h_monthly_fee" value="${hval('monthly_fee')}">`)}
            ${row('חל מע"מ (עוסק)', `<select name="h_vat_applies"><option value="">לא ידוע</option><option value="true"${holding.vat_applies === true ? ' selected' : ''}>כן – עוסק</option><option value="false"${holding.vat_applies === false ? ' selected' : ''}>לא – מגורים</option></select>`)}
            ${row('החוזה בתוקף עד', `<input type="date" name="h_contract_end" value="${hval('contract_end')}">`)}
            ${row('תחילת ההחזקה', `<input type="date" name="h_start_date" value="${hval('start_date')}">`)}
            ${row('סיום ההחזקה (עזיבה)', `<input type="date" name="h_end_date" value="${hval('end_date')}">`)}
            ${row('הנכס מנוהל בידי', inp('managed_by'))}
          </dl>
          <p class="hint">החלפת המחזיק או ניקוי השדה לא מוחקים את המחזיק הקודם: ההחזקה שלו נסגרת בתאריך של היום ונשמרת בהיסטוריה. פרטי איש הקשר (טלפון, מייל) נערכים בדף "אנשי קשר".</p>` : holdingsHtml}</section>
        ${E || a.institution_name || a.institution_code ? `<section class="card"><h2>מוסד</h2><dl class="fields">
          ${row('שם מוסד', inp('institution_name', esc(a.institution_name)))}
          ${row('סמל מוסד', inp('institution_code', esc(a.institution_code), 'text', 'inputmode="numeric"'))}
        </dl></section>` : ''}
      </div>

      <div class="tabpanel" role="tabpanel" id="panel-surveys" aria-labelledby="tab-surveys" hidden>
        <section class="card"><h2>ביקורות</h2>${surveysHtml}</section>
      </div>

      <div class="tabpanel" role="tabpanel" id="panel-proc" aria-labelledby="tab-proc" hidden>
        <section class="card"><h2>תהליכים</h2>${procHtml}</section>
      </div>

      ${E ? '<div class="sticky-actions edit-actions"><button class="primary" id="saveBtn" type="button">שמירה</button><button id="cancelBtn" type="button">ביטול</button><span class="hint">מצב עריכה – השינויים נשמרים רק בלחיצה על "שמירה"</span></div>' : ''}
      ${a.import_source_row ? `<p class="hint">מקור ייבוא: ${esc(a.import_source_file || '')} · גיליון ${esc(a.import_source_sheet || '')} · שורה ${esc(a.import_source_row)}</p>` : ''}`;

    // מעבר בין לשוניות; הלשונית נשמרת בכתובת (#cons וכד'), כך שרענון או קישור חוזרים לאותה לשונית
    const tabs = [...main.querySelectorAll('[role=tab]')];
    function show(id, focus) {
      if (!TABS.some(t => t[0] === id)) id = 'main';
      tabs.forEach(b => { const on = b.dataset.tab === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
      main.querySelectorAll('.tabpanel').forEach(pn => pn.hidden = pn.id !== 'panel-' + id);
      const cb = document.getElementById('consBox'); if (cb) cb.hidden = id !== 'main';
      document.getElementById('notesBox').hidden = id !== 'main';
      history.replaceState(null, '', location.pathname + location.search + (id === 'main' ? '' : '#' + id));
    }
    tabs.forEach((b, i) => {
      b.onclick = () => show(b.dataset.tab);
      b.onkeydown = e => {  // חצים: בעברית ימין = הקודם, שמאל = הבא
        const d = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : 0;
        if (d) { e.preventDefault(); show(tabs[(i + d + tabs.length) % tabs.length].dataset.tab, true); }
      };
    });
    // ----- פעולות בהערות ובתהליכים: אחרי כל פעולה הכרטיס נטען מחדש באותה לשונית -----
    const reload = tab => { location.hash = tab; location.reload(); };
    const act = async (fn, tab, okMsg) => { try { await fn(); ui.toast(okMsg); reload(tab); } catch (err) { ui.toast(ui.authError ? ui.authError(err) : (err.message || String(err)), 'err'); } };
    const nf = document.getElementById('noteForm');
    if (nf) nf.addEventListener('submit', e => { e.preventDefault(); const body = nf.body.value.trim(); if (!body) return; nf.querySelector('button').disabled = true;
      act(() => data.addNote(a.id, body), 'notes', 'ההערה נוספה'); });
    const pf = document.getElementById('procForm');
    if (pf) pf.addEventListener('submit', e => { e.preventDefault(); if (!pf.process_type.value) return; pf.querySelector('button').disabled = true;
      act(() => data.addProcess({ asset_id: a.id, process_type: pf.process_type.value, description: pf.description.value, status: pf.status.value }), 'proc', 'התהליך נפתח'); });
    main.addEventListener('change', e => { const sel = e.target.closest('[data-status]'); if (!sel) return;
      act(() => data.setProcessStatus(sel.closest('[data-proc]').dataset.proc, sel.value), 'proc', 'הסטטוס עודכן'); });
    main.addEventListener('click', e => {
      const dn = e.target.closest('[data-del-note]'), dp = e.target.closest('[data-del-proc]');
      if (dn && dn.dataset.sure) act(() => data.deleteNote(dn.closest('[data-note]').dataset.note), 'notes', 'ההערה נמחקה');
      else if (dp && dp.dataset.sure) act(() => data.deleteProcess(dp.closest('[data-proc]').dataset.proc), 'proc', 'התהליך נמחק');
      else if (dn || dp) { const b = dn || dp; b.dataset.sure = '1'; b.textContent = 'ללחוץ שוב לאישור המחיקה'; }  // אישור בלי חלון קופץ
    });

    // #cons (חזרה מעריכת התמורה): לשונית ראשי עם נתוני התמורה פתוחים
    const h0 = location.hash.slice(1);
    show(h0 === 'cons' || h0 === 'notes' ? 'main' : h0 || 'main');
    if (h0 === 'notes') { document.getElementById('notesBox').scrollIntoView({ block: 'start' }); history.replaceState(null, '', location.pathname + location.search); }
    if (h0 === 'cons') { const cb = document.getElementById('consBox'); if (cb) { cb.open = true; cb.scrollIntoView({ block: 'start' }); } }

    const eb = document.getElementById('editBtn'); if (eb) eb.onclick = () => render(true);
    if (E) wireEdit(a, holding);

    const del = document.getElementById('delBtn');
    if (del) del.onclick = async () => {
      if (!confirm('לבטל את הנכס? הרשומה לא נמחקת, אלא מסומנת כמבוטלת ולא תופיע ברשימה.')) return;
      try { await data.softDeleteAsset(a.id); location.href = ui.listUrl('../'); } catch (e) { ui.toast(e.message, 'err'); }
    };
  }

  // ---------- מצב עריכה: שדות תלויים, חלקות ושמירה ----------
  function wireEdit(a, holding) {
    const q = name => main.querySelector(`[name="${name}"]`);
    main.addEventListener('input', () => { dirty = true; }, { once: true });
    main.addEventListener('change', () => { dirty = true; }, { once: true });
    // שימוש מפורט תלוי בתחום השימוש
    function renderUseDetail() {
      const domain = q('use_domain').value, cur = q('use_detail') ? q('use_detail').value : a.use_detail;
      const opts = domain ? data.options('use_detail', domain) : [];
      document.getElementById('useDetailWrap').innerHTML = opts.length ? ui.selectHtml('use_detail', 'use_detail', cur, { parent: domain })
        : '<select name="use_detail" disabled><option value="">— אין פירוט לתחום הזה —</option></select>';
    }
    q('use_domain').addEventListener('change', renderUseDetail); renderUseDetail();
    // חלקות
    const box = document.getElementById('parcels');
    const parcelRow = (p = {}) => {
      const div = document.createElement('div'); div.className = 'parcel-row';
      div.innerHTML = `<input placeholder="גוש" data-k="gush" value="${esc(p.gush || '')}" inputmode="numeric" aria-label="גוש">
        <input placeholder="חלקה" data-k="helka" value="${esc(p.helka || '')}" inputmode="numeric" aria-label="חלקה">
        <input placeholder="תת־חלקה" data-k="sub_helka" value="${esc(p.sub_helka || '')}" aria-label="תת חלקה">
        <button type="button" aria-label="הסרת חלקה">הסרה</button>`;
      div.querySelector('button').onclick = () => { div.remove(); dirty = true; };
      box.appendChild(div);
    };
    (a.parcels.length ? a.parcels : [{}]).forEach(parcelRow);
    document.getElementById('addParcel').onclick = () => parcelRow();

    document.getElementById('cancelBtn').onclick = () => { render(false); window.scrollTo(0, 0); };
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.onclick = async () => {
      // יוצאים מהרשומה המלאה שבמסד ומחליפים רק את השדות שמופיעים בכרטיס – שדה שלא מוצג לא נדרס
      const raw = data._db.assets.find(x => x.id === a.id);
      const row = { ...raw }; delete row.updated_at;
      const hf = {};
      main.querySelectorAll('[name]').forEach(el => { if (el.disabled) return; const v = el.value.trim();
        if (el.name.startsWith('h_')) hf[el.name.slice(2)] = v; else row[el.name] = v; });
      if (q('use_detail') && q('use_detail').disabled) row.use_detail = null;
      const parcelList = [...box.querySelectorAll('.parcel-row')].map(r => Object.fromEntries([...r.querySelectorAll('input')].map(i => [i.dataset.k, i.value.trim()])));
      saveBtn.disabled = true;
      try {
        await data.saveAsset(row, parcelList);
        // מחזיק: החלפה או הסרה סוגרות את ההחזקה הקודמת (נשארת בהיסטוריה)
        let holderId = hf.holder_id;
        if (!holderId && hf.new_name) holderId = (await data.saveHolder({ name: hf.new_name, holder_type: hf.new_type || null, contact_name: hf.new_contact || null, phone: hf.new_phone || null })).id;
        const today = new Date().toISOString().slice(0, 10);
        const same = holding.id && holderId === holding.holder_id;
        if (holding.id && !same) await data.saveHolding({ id: holding.id, asset_id: holding.asset_id, holder_id: holding.holder_id, end_date: holding.end_date && holding.end_date <= today ? holding.end_date : today });
        if (holderId) {
          const h = { asset_id: a.id, holder_id: holderId, holding_method: hf.holding_method, agreement_status: hf.agreement_status, monthly_fee: hf.monthly_fee,
            vat_applies: hf.vat_applies === 'true' ? true : hf.vat_applies === 'false' ? false : null, contract_end: hf.contract_end, start_date: hf.start_date };
          if (same) { h.id = holding.id; h.end_date = hf.end_date; }
          else if (!h.start_date || h.start_date === holding.start_date) h.start_date = today;
          await data.saveHolding(h);
        }
        dirty = false; ui.toast('הנכס נשמר'); location.reload();
      } catch (err) { ui.toast(err.message || String(err), 'err'); saveBtn.disabled = false; }
    };
  }

  render();
})();
