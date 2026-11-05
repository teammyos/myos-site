# הקמת Supabase לאתר BBM – מדריך

Supabase הוא המקום שבו יישמרו הנתונים, המשתמשים וההרשאות של אתר BBM. כל עוד הוא לא מחובר, האתר עובד במצב הדגמה.

**חשוב:** supabase.com חסום ברשת העירייה. את ההקמה עושים מהבית.

## שלב 1 · יצירת פרויקט
1. נכנסים ל-https://supabase.com ← **Sign in** (אפשר עם GitHub של teammyos).
2. **New project**.
3. שם: `bbm`.
4. Region: **Frankfurt (eu-central-1)**.
5. סיסמת בסיס נתונים: סיסמה חזקה. שומרים אותה בצד, לא שולחים אותה לאף אחד.
6. ממתינים כשתי דקות עד שהפרויקט מוכן.

## שלב 2 · הרצת מבנה הנתונים
1. בתפריט הצד: **SQL Editor** ← **New query**.
2. פותחים בדפדפן את הקובץ
   https://github.com/teammyos/BBM/blob/main/supabase/001_schema.sql
   לוחצים על כפתור ההעתקה (Copy raw file), מדביקים בחלון השאילתה ולוחצים **Run**.
3. אמורה להופיע הודעת הצלחה (Success. No rows returned).
4. **New query** נוסף, ואותו דבר עם הקובץ
   https://github.com/teammyos/BBM/blob/main/supabase/002_lookups.sql

## שלב 3 · הגדרת הכניסה
1. **Authentication** ← **Sign In / Providers**: לוודא ש-**Email** מופעל.
2. **Authentication** ← **URL Configuration**:
   - Site URL: `https://myos.co.il/BBM/`
   - Redirect URLs: להוסיף `https://myos.co.il/BBM/**`

## שלב 4 · מה לשלוח לClaude
מ-**Project Settings** ← **API Keys** (או **Data API**):
- **Project URL** – נראה כמו `https://abcdxyz.supabase.co`
- **anon / publishable key** – המפתח הציבורי. מותר שיהיה גלוי.

**לא לשלוח** את המפתח `service_role` / `secret` ואת סיסמת בסיס הנתונים.

## שלב 5 · הפיכת עצמך למנהל
אחרי שהאתר מחובר:
1. נכנסים ל-https://myos.co.il/BBM/login.html ← **יצירת חשבון חדש** עם המייל שלך.
2. מאשרים את מייל האימות, אם נשלח.
3. ב-Supabase ← **SQL Editor** מריצים (עם המייל שלך):

```sql
update public.app_users set approved = true, role = 'admin'
where email = 'המייל@שלך';
```

מכאן אתה מנהל. משתמשים נוספים יירשמו בעצמם ויחכו לאישורך.

## רמות הרשאה
| תפקיד | מה מותר |
|---|---|
| viewer – צפייה | לראות את כל הנתונים |
| editor_limited – עריכה מוגבלת | צפייה + הוספת ביקורות/סקר ועדכון מחזיקים |
| editor – עריכה מלאה | הכול חוץ מניהול משתמשים ורשימות |
| admin – מנהל | הכול, כולל אישור משתמשים ועריכת רשימות |
