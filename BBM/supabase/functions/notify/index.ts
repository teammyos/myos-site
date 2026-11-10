// =============================================================================
// notify – מיילים של BBM דרך Resend
//
// נקראת מטריגרים במסד הנתונים (supabase/003_notify.sql) דרך pg_net.
// סוגי הודעות (body.kind):
//   signup   → לכל המנהלים: נרשם/ה משתמש/ת חדש/ה שממתין/ה לאישור
//   approved → למשתמש/ת: החשבון אושר
// הפונקציה מקבלת רק kind + user_id, ומאתרת בעצמה את הנמענים במסד הנתונים.
// כך גם מי שמשיג את הסוד לא יכול לשלוח מיילים לכתובות שרירותיות.
//
// פריסה: Edge Functions → notify, עם Verify JWT = OFF (הקריאה מגיעה מהמסד, בלי משתמש).
// סודות (Edge Functions → Secrets):
//   RESEND_API_KEY  – מפתח "BBM Supabase" מ-Resend
//   NOTIFY_SECRET   – אותו ערך שנשמר ב-private.settings במסד (לא נשמר בקוד)
//   MAIL_FROM       – "BBM ניהול נכסים <bbm@myos.co.il>"
// SUPABASE_URL ו-SUPABASE_SERVICE_ROLE_KEY קיימים אוטומטית – לא מגדירים ידנית.
//
// כללי מייל (כמו ב-MyOS משימות): טבלאות, style inline, dir="rtl" על כל טבלה ותא.
// =============================================================================

const RESEND_KEY = Deno.env.get("RESEND_API_KEY") || "";
const SECRET = Deno.env.get("NOTIFY_SECRET") || "";
const MAIL_FROM = Deno.env.get("MAIL_FROM") || "BBM ניהול נכסים <bbm@myos.co.il>";
const SB_URL = Deno.env.get("SUPABASE_URL") || "";
// מפתח שרת: הישן (service_role) או החדש (sb_secret_...), מה שקיים בסביבה
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY") || "";
const SITE = "https://myos.co.il/BBM/";

const ROLES: Record<string, string> = {
  viewer: "צפייה", editor_limited: "עריכה מוגבלת", editor: "עריכה מלאה", admin: "מנהל",
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function wrap(title: string, lines: string[], cta: string, href: string, note = "") {
  return `<table dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:28px 12px;font-family:'Segoe UI',Arial,sans-serif;">
<tr><td dir="rtl" align="center">
<table dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #dde3ea;border-radius:10px;">
<tr><td dir="rtl" style="background:#1f5f8b;color:#ffffff;padding:16px 22px;font-size:18px;font-weight:bold;text-align:right;border-radius:10px 10px 0 0;">BBM · ניהול נכסים</td></tr>
<tr><td dir="rtl" style="padding:22px;text-align:right;color:#1d2733;font-size:15px;line-height:1.7;">
<h1 style="margin:0 0 12px;font-size:19px;">${esc(title)}</h1>
${lines.map((l) => `<p style="margin:0 0 12px;">${l}</p>`).join("\n")}
<p style="margin:20px 0;"><a href="${href}" style="display:inline-block;background:#1f5f8b;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 26px;border-radius:6px;">${esc(cta)}</a></p>
${note ? `<p style="margin:0;color:#5b6876;font-size:13px;">${note}</p>` : ""}
</td></tr>
<tr><td dir="rtl" style="padding:14px 22px;border-top:1px solid #eef1f4;color:#5b6876;font-size:12px;text-align:right;">עיריית בני ברק · מחלקת נכסים · מייל אוטומטי, אין להשיב אליו.</td></tr>
</table></td></tr></table>`;
}

async function db(path: string) {
  const headers: Record<string, string> = { apikey: SB_SERVICE };
  if (!SB_SERVICE.startsWith("sb_")) headers.Authorization = `Bearer ${SB_SERVICE}`;
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers });
  if (!r.ok) throw new Error(`db ${r.status}: ${await r.text()}`);
  return r.json();
}

async function send(to: string[], subject: string, html: string) {
  if (!to.length) return { skipped: "no recipients" };
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: MAIL_FROM, to, subject, html }),
  });
  const body = await r.text();
  if (!r.ok) throw new Error(`resend ${r.status}: ${body}`);
  return JSON.parse(body);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!SECRET || req.headers.get("x-bbm-secret") !== SECRET) return json({ error: "forbidden" }, 403);
  if (!RESEND_KEY) return json({ error: "RESEND_API_KEY missing" }, 500);

  let body: { kind?: string; user_id?: string };
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const uid = String(body.user_id || "");
  if (!/^[0-9a-f-]{36}$/i.test(uid)) return json({ error: "bad user_id" }, 400);

  try {
    const [user] = await db(`app_users?id=eq.${uid}&select=email,full_name,role,approved,created_at`);
    if (!user) return json({ error: "user not found" }, 404);
    const who = user.full_name ? `${esc(user.full_name)} (${esc(user.email)})` : esc(user.email);

    if (body.kind === "signup") {
      const admins = await db(`app_users?role=eq.admin&approved=eq.true&select=email`);
      const to = admins.map((a: { email: string }) => a.email).filter((e: string) => e && e !== user.email);
      const res = await send(to, `נרשם/ה משתמש/ת חדש/ה – ${user.email}`, wrap(
        "משתמש/ת חדש/ה ממתין/ה לאישור",
        [`<strong>${who}</strong> נרשם/ה למערכת ניהול הנכסים.`,
         "החשבון לא יוכל לצפות בנתונים עד שתאשרו אותו ותבחרו הרשאה."],
        "לאישור המשתמש/ת", `${SITE}users.html`,
        "אם אינך מכיר/ה את הנרשם/ת, אפשר להשאיר את החשבון ממתין או לחסום אותו."));
      return json({ ok: true, kind: "signup", to: to.length, res });
    }

    if (body.kind === "approved") {
      if (!user.approved) return json({ skipped: "not approved" });
      const res = await send([user.email], "החשבון שלך במערכת ניהול הנכסים אושר", wrap(
        "החשבון אושר",
        ["שלום,", `החשבון ${esc(user.email)} במערכת ניהול הנכסים של עיריית בני ברק אושר.`,
         `ההרשאה שלך: <strong>${esc(ROLES[user.role] || user.role)}</strong>.`],
        "כניסה למערכת", SITE,
        "נכנסים עם כתובת הדוא\"ל והסיסמה שבחרת בהרשמה. שכחת סיסמה? בדף הכניסה יש \"שכחתי סיסמה\"."));
      return json({ ok: true, kind: "approved", res });
    }

    return json({ error: "unknown kind" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});
