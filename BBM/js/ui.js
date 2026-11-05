/*
 * רכיבי ממשק משותפים: כותרת ותפריט, בדיקת כניסה, פונקציות עזר.
 * כל דף קורא ל-BBM.ui.start({ base, active }) ומקבל את הנתונים טעונים.
 */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const param = name => new URLSearchParams(location.search).get(name);

  function header(base, active) {
    const items = [
      ['index.html', 'דף הבית', 'home'],
      ['assets/index.html', 'נכסים', 'assets'],
      ['assets/considerations.html', 'תמורות ציבוריות', 'considerations'],
      ['assets/dashboard.html', 'תמונת מצב', 'dashboard']
    ];
    const nav = items.map(([href, text, key]) =>
      `<a href="${base}${href}"${key === active ? ' aria-current="page"' : ''}>${text}</a>`).join('');
    const demo = BBM.data.mode === 'demo'
      ? '<div class="demo-bar" role="status">מצב הדגמה: נתוני דוגמה בלבד. שינויים נשמרים רק בלשונית הזו ונמחקים כשסוגרים אותה. <button class="link" type="button" onclick="BBM.data.resetDemo()">איפוס נתוני הדוגמה</button></div>' : '';
    return `${demo}<header class="top"><a class="brand" href="${base}index.html">BBM · ניהול נכסים</a>
      <nav>${nav}</nav><div class="user" id="userBox"></div></header>`;
  }

  async function start({ base = '', active = '' } = {}) {
    document.body.insertAdjacentHTML('afterbegin', header(base, active));
    const main = document.querySelector('main');
    if (BBM.data.mode === 'live') {
      const { data } = await BBM.data.supabase.auth.getSession();
      if (!data.session) { location.href = base + 'login.html?next=' + encodeURIComponent(location.href); return false; }
      const { data: me } = await BBM.data.supabase.from('app_users').select('*').eq('id', data.session.user.id).maybeSingle();
      BBM.me = me;
      document.getElementById('userBox').innerHTML =
        `<span>${esc(data.session.user.email)}</span> <button class="link" id="logout">יציאה</button>`;
      document.getElementById('logout').onclick = async () => { await BBM.data.supabase.auth.signOut(); location.href = base + 'login.html'; };
      if (!me || !me.approved) {
        main.innerHTML = '<div class="card"><h1>ממתין לאישור מנהל</h1><p>החשבון נוצר. מנהל המערכת צריך לאשר אותו לפני שתוכל לצפות בנתונים.</p></div>';
        return false;
      }
    } else {
      BBM.me = { role: 'admin', approved: true };
    }
    try { await BBM.data.init(); }
    catch (e) { main.innerHTML = `<div class="card error">שגיאה בטעינת הנתונים: ${esc(e.message)}</div>`; return false; }
    return true;
  }

  const canEdit = () => BBM.me && ['editor', 'admin'].includes(BBM.me.role);
  const canEditLimited = () => BBM.me && ['editor_limited', 'editor', 'admin'].includes(BBM.me.role);

  function toast(msg, kind = 'ok') {
    const t = document.createElement('div');
    t.className = 'toast ' + kind; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 3500);
  }

  function selectHtml(name, list, value, { parent, empty = '— בחר —', id } = {}) {
    const opts = BBM.data.options(list, parent)
      .map(o => `<option value="${esc(o.code)}"${o.code === value ? ' selected' : ''}>${esc(o.label)}</option>`).join('');
    return `<select name="${name}" id="${id || name}"><option value="">${empty}</option>${opts}</select>`;
  }

  function download(filename, content, type = 'text/csv;charset=utf-8') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  const fmtDate = d => d ? new Date(d).toLocaleDateString('he-IL') : '';
  const fmtNum = n => n == null || n === '' ? '' : Number(n).toLocaleString('he-IL');

  window.BBM.ui = { start, esc, param, toast, selectHtml, download, fmtDate, fmtNum, canEdit, canEditLimited };
})();
