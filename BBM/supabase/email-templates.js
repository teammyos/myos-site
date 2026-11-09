/*
 * תבניות המיילים של BBM (Supabase Auth → Emails → Templates).
 * מקור יחיד לנוסח. אחרי שינוי – להדביק מחדש ב-Supabase (Claude עושה זאת).
 * כללי מייל (כמו ב-MyOS משימות): פריסה בטבלאות, style inline, dir="rtl" על כל טבלה ותא.
 */
const wrap = (title, lines, cta, note) => `<table dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:28px 12px;font-family:'Segoe UI',Arial,sans-serif;">
<tr><td dir="rtl" align="center">
<table dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #dde3ea;border-radius:10px;">
<tr><td dir="rtl" style="background:#1f5f8b;color:#ffffff;padding:16px 22px;font-size:18px;font-weight:bold;text-align:right;border-radius:10px 10px 0 0;">BBM · ניהול נכסים</td></tr>
<tr><td dir="rtl" style="padding:22px;text-align:right;color:#1d2733;font-size:15px;line-height:1.7;">
<h1 style="margin:0 0 12px;font-size:19px;">${title}</h1>
${lines.map(l => `<p style="margin:0 0 12px;">${l}</p>`).join('\n')}
<p style="margin:20px 0;"><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1f5f8b;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 26px;border-radius:6px;">${cta}</a></p>
<p style="margin:0;color:#5b6876;font-size:13px;">${note}</p>
</td></tr>
<tr><td dir="rtl" style="padding:14px 22px;border-top:1px solid #eef1f4;color:#5b6876;font-size:12px;text-align:right;">עיריית בני ברק · מחלקת נכסים · מייל אוטומטי, אין להשיב אליו.</td></tr>
</table></td></tr></table>`;

module.exports = {
  confirmation: {
    subject: 'אימות כתובת הדוא"ל – BBM ניהול נכסים',
    body: wrap('אימות כתובת הדוא"ל',
      ['שלום,', 'נוצר חשבון במערכת ניהול הנכסים עבור {{ .Email }}.', 'כדי להשלים את ההרשמה, יש לאמת את כתובת הדוא"ל.'],
      'אימות הכתובת',
      'אחרי האימות החשבון ימתין לאישור מנהל. אם לא נרשמת למערכת, אפשר להתעלם מהמייל.')
  },
  recovery: {
    subject: 'איפוס סיסמה – BBM ניהול נכסים',
    body: wrap('איפוס סיסמה',
      ['שלום,', 'התקבלה בקשה לאיפוס הסיסמה של החשבון {{ .Email }}.', 'הקישור תקף לשעה אחת ולשימוש אחד.'],
      'בחירת סיסמה חדשה',
      'אם לא ביקשת לאפס את הסיסמה, אפשר להתעלם מהמייל. הסיסמה הקיימת לא תשתנה.')
  },
  invite: {
    subject: 'הזמנה למערכת ניהול הנכסים – BBM',
    body: wrap('הוזמנת למערכת ניהול הנכסים',
      ['שלום,', 'הוזמנת להצטרף למערכת ניהול הנכסים של עיריית בני ברק, עם הכתובת {{ .Email }}.'],
      'הצטרפות למערכת',
      'בלחיצה על הכפתור תתבקש לבחור סיסמה.')
  },
  email_change: {
    subject: 'אישור שינוי כתובת דוא"ל – BBM ניהול נכסים',
    body: wrap('אישור כתובת דוא"ל חדשה',
      ['שלום,', 'התקבלה בקשה לשנות את כתובת הדוא"ל של החשבון ל-{{ .NewEmail }}.'],
      'אישור הכתובת החדשה',
      'אם לא ביקשת את השינוי, אפשר להתעלם מהמייל.')
  }
};
