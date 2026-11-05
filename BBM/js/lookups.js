/*
 * רשימות המערכת – מקור אחד לכל רשימות הבחירה.
 * כל ערך: [קוד יציב, כיתוב בעברית] או [קוד, כיתוב, קוד אב] (לשימוש מפורט).
 * את הכיתוב מותר לשנות; את הקוד לא משנים, כי הוא נשמר בנתונים.
 * הקובץ משמש גם את מצב ההדגמה וגם ליצירת supabase/002_lookups.sql.
 */
window.BBM_LOOKUPS = {
  physical_type: [
    ['land', 'קרקע'], ['building', 'מבנה'], ['unit', 'יחידה במבנה'],
    ['facility', 'מתקן'], ['other', 'אחר']
  ],
  record_status: [['existing', 'נכס קיים'], ['future', 'נכס עתידי']],
  holding_purpose: [
    ['public_service', 'שירות ציבורי'], ['internal_use', 'שימוש עירוני פנימי'],
    ['income', 'נכס מניב'], ['reserve', 'עתודה'], ['other', 'אחר'], ['unknown', 'לא ידוע']
  ],
  use_domain: [
    ['education', 'חינוך'], ['community', 'קהילה ותרבות'], ['welfare_health', 'רווחה ובריאות'],
    ['municipal_admin', 'מינהל עירוני'], ['sport', 'ספורט ופנאי'], ['commerce', 'מסחר'],
    ['housing', 'מגורים'], ['storage', 'אחסנה ולוגיסטיקה'], ['infrastructure', 'תשתיות'],
    ['open_space', 'שטח פתוח'], ['no_use', 'ללא שימוש'], ['other', 'אחר'], ['unknown', 'לא ידוע']
  ],
  use_detail: [
    ['kindergarten', 'גן ילדים', 'education'], ['school', 'בית ספר', 'education'],
    ['talmud_torah', 'תלמוד תורה', 'education'], ['daycare', 'מעון יום', 'education'],
    ['synagogue', 'בית כנסת', 'community'], ['community_center', 'מועדון קהילתי', 'community'],
    ['library', 'ספרייה', 'community'],
    ['welfare_office', 'לשכת רווחה', 'welfare_health'], ['clinic', 'מרפאה', 'welfare_health'],
    ['municipal_office', 'משרדי עירייה', 'municipal_admin'], ['rabbinate', 'לשכת רב', 'municipal_admin'],
    ['shop', 'חנות', 'commerce'], ['office', 'משרד', 'commerce'], ['kiosk', 'קיוסק', 'commerce'],
    ['snack_bar', 'מזנון', 'commerce'],
    ['warehouse', 'מחסן', 'storage'], ['parking', 'חניה', 'infrastructure'],
    ['road', 'דרך', 'infrastructure'], ['public_garden', 'שצ"פ / גינה', 'open_space']
  ],
  right_type: [
    ['ownership', 'בעלות'], ['lease_long', 'חכירה'], ['rent', 'שכירות'], ['use_right', 'זכות שימוש'],
    ['contractual', 'זכות חוזית'], ['future_right', 'זכות עתידית'], ['other', 'אחר'], ['unknown', 'לא ידוע']
  ],
  right_source: [
    ['purchase', 'רכישה'], ['expropriation', 'הפקעה'], ['public_consideration', 'תמורה ציבורית'],
    ['agreement', 'הסכם'], ['transfer', 'העברה'], ['rent', 'שכירות'], ['by_plan', 'מכוח תכנית'],
    ['other', 'אחר'], ['unknown', 'לא ידוע']
  ],
  operational_status: [
    ['active', 'פעיל'], ['vacant', 'פנוי'], ['unused', 'לא בשימוש'], ['under_construction', 'בבנייה'],
    ['renovation', 'בשיפוץ'], ['third_party', 'מוחזק בידי צד שלישי'], ['trespass', 'קיימת פלישה'],
    ['unknown', 'לא ידוע']
  ],
  physical_condition: [
    ['good', 'תקין'], ['fair', 'בינוני'], ['poor', 'דורש טיפול'], ['shell', 'רמת מעטפת'], ['unknown', 'לא ידוע']
  ],
  realization_status: [
    ['not_relevant', 'לא רלוונטי'], ['commitment', 'התחייבות'], ['realized', 'מומש'],
    ['realized_split', 'מומשה ופוצלה']
  ],
  consideration_stage: [
    ['commitment', 'התחייבות'], ['permit', 'היתר'], ['construction', 'בבנייה'],
    ['form4', 'טופס 4'], ['delivered', 'נמסר'], ['unknown', 'לא ידוע']
  ],
  holder_type: [
    ['association', 'עמותה'], ['edu_institution', 'מוסד חינוך'], ['municipal_body', 'גוף עירוני'],
    ['business', 'חברה / עסק'], ['private_person', 'אדם פרטי'], ['government', 'משרד ממשלתי'],
    ['other', 'אחר']
  ],
  holding_method: [
    ['allocation', 'הקצאה'], ['rent', 'שכירות'], ['use_permit', 'רשות שימוש'],
    ['municipal_use', 'שימוש עירוני'], ['no_arrangement', 'ללא הסדר'], ['unknown', 'לא ידוע']
  ],
  agreement_status: [
    ['valid', 'בתוקף'], ['expired', 'פג תוקף'], ['in_process', 'בטיפול'], ['none', 'אין הסכם'],
    ['unknown', 'לא ידוע']
  ],
  area_match: [['match', 'תואם'], ['shortage', 'חוסר'], ['surplus', 'עודף'], ['not_checked', 'לא נבדק']],
  priority: [['high', 'גבוהה'], ['medium', 'בינונית'], ['low', 'נמוכה']]
};
