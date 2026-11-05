/*
 * נתוני דוגמה למצב הדגמה. כתובות, שמות ומספרים בדויים.
 * כל רשומה מדגימה תרחיש מהאפיון.
 */
window.BBM_DEMO = {
  complexes: [
    { id: 'c1', complex_number: 'M-001', name: 'קריית שירותים עירונית (דוגמה)', description: 'שני מבנים על שלוש חלקות, פועלים כיחידה אחת' }
  ],
  parcels: [
    { id: 'p1', gush: '6100', helka: '10', sub_helka: '' },
    { id: 'p2', gush: '6100', helka: '11', sub_helka: '' },
    { id: 'p3', gush: '6100', helka: '12', sub_helka: '' },
    { id: 'p4', gush: '6101', helka: '20', sub_helka: '' },
    { id: 'p5', gush: '6102', helka: '30', sub_helka: '' },
    { id: 'p6', gush: '6103', helka: '40', sub_helka: '' },
    { id: 'p7', gush: '6104', helka: '50', sub_helka: '' },
    { id: 'p8', gush: '6105', helka: '60', sub_helka: '' }
  ],
  holders: [
    { id: 'h1', holder_type: 'association', name: 'עמותת חינוך לדוגמה', contact_name: 'איש קשר א', phone: '050-0000001' },
    { id: 'h2', holder_type: 'business', name: 'עסק לדוגמה בע"מ', contact_name: 'איש קשר ב', phone: '050-0000002' },
    { id: 'h3', holder_type: 'municipal_body', name: 'אגף הרווחה' }
  ],
  assets: [
    // 1. קרקע ועליה מבנה
    { id: 'a1', asset_number: '90001', name: 'קרקע למבני ציבור – רחוב הדוגמה', record_status: 'existing', physical_type: 'land',
      street: 'הדוגמה', house_number: '1', planning_designation: 'שב"צ', holding_purpose: 'public_service',
      use_domain: 'education', right_type: 'ownership', right_source: 'expropriation', operational_status: 'active' },
    { id: 'a2', asset_number: '90002', name: 'מבנה תלמוד תורה', record_status: 'existing', physical_type: 'building', parent_asset_id: 'a1',
      street: 'הדוגמה', house_number: '1', use_domain: 'education', use_detail: 'talmud_torah', holding_purpose: 'public_service',
      right_type: 'ownership', right_source: 'expropriation', operational_status: 'third_party', physical_condition: 'good', area_built: 620 },
    // 2. מבנה ובתוכו יחידות
    { id: 'a3', asset_number: '90003', name: 'בניין שירותים עירוני', record_status: 'existing', physical_type: 'building',
      street: 'השירות', house_number: '5', holding_purpose: 'internal_use', use_domain: 'municipal_admin',
      right_type: 'ownership', right_source: 'purchase', operational_status: 'active', area_built: 900 },
    { id: 'a4', asset_number: '90004', name: 'קומת משרדי עירייה', record_status: 'existing', physical_type: 'unit', parent_asset_id: 'a3',
      street: 'השירות', house_number: '5', holding_purpose: 'internal_use', use_domain: 'municipal_admin', use_detail: 'municipal_office',
      right_type: 'ownership', right_source: 'purchase', operational_status: 'active', area_built: 400 },
    { id: 'a5', asset_number: '90005', name: 'מועדון קהילתי', record_status: 'existing', physical_type: 'unit', parent_asset_id: 'a3',
      street: 'השירות', house_number: '5', holding_purpose: 'public_service', use_domain: 'community', use_detail: 'community_center',
      right_type: 'ownership', right_source: 'purchase', operational_status: 'active', area_built: 300 },
    { id: 'a6', asset_number: '90006', name: 'יחידה פנויה בקומת קרקע', record_status: 'existing', physical_type: 'unit', parent_asset_id: 'a3',
      street: 'השירות', house_number: '5', holding_purpose: 'reserve', use_domain: 'no_use',
      right_type: 'ownership', right_source: 'purchase', operational_status: 'vacant', area_built: 200 },
    // 3. יחידה בבניין פרטי
    { id: 'a7', asset_number: '90007', name: 'יחידה ציבורית בבניין מגורים', record_status: 'existing', physical_type: 'unit',
      street: 'השקד', house_number: '12', holding_purpose: 'public_service', use_domain: 'education', use_detail: 'kindergarten',
      right_type: 'ownership', right_source: 'public_consideration', operational_status: 'active', area_built: 110, area_yard: 40,
      folder_path: 'S:\\נכסים\\90007 השקד 12' },
    // 4. תמורה עתידית
    { id: 'a8', asset_number: 'T-2026-001', name: 'תמורה עתידית – 500 מ"ר בפרויקט הדקל', record_status: 'future', physical_type: 'unit',
      street: 'הדקל', house_number: '8', holding_purpose: 'public_service', use_domain: 'unknown',
      right_type: 'future_right', right_source: 'public_consideration', operational_status: 'under_construction',
      realization_status: 'commitment', area_built: 500 },
    // 5. תמורה שפוצלה
    { id: 'a9', asset_number: 'T-2025-004', name: 'התחייבות מקורית – פרויקט האלון', record_status: 'future', physical_type: 'unit',
      street: 'האלון', house_number: '3', right_type: 'future_right', right_source: 'public_consideration',
      realization_status: 'realized_split', area_built: 500 },
    { id: 'a10', asset_number: '90010', name: 'גן ילדים א – האלון', record_status: 'existing', physical_type: 'unit', street: 'האלון', house_number: '3',
      holding_purpose: 'public_service', use_domain: 'education', use_detail: 'kindergarten', right_type: 'ownership',
      right_source: 'public_consideration', operational_status: 'active', realization_status: 'realized', area_built: 100 },
    { id: 'a11', asset_number: '90011', name: 'גן ילדים ב – האלון', record_status: 'existing', physical_type: 'unit', street: 'האלון', house_number: '3',
      holding_purpose: 'public_service', use_domain: 'education', use_detail: 'kindergarten', right_type: 'ownership',
      right_source: 'public_consideration', operational_status: 'active', realization_status: 'realized', area_built: 100 },
    { id: 'a12', asset_number: '90012', name: 'מעון יום – האלון', record_status: 'existing', physical_type: 'unit', street: 'האלון', house_number: '3',
      holding_purpose: 'public_service', use_domain: 'education', use_detail: 'daycare', right_type: 'ownership',
      right_source: 'public_consideration', operational_status: 'active', realization_status: 'realized', area_built: 90 },
    { id: 'a13', asset_number: '90013', name: 'לשכת רווחה – האלון', record_status: 'existing', physical_type: 'unit', street: 'האלון', house_number: '3',
      holding_purpose: 'public_service', use_domain: 'welfare_health', use_detail: 'welfare_office', right_type: 'ownership',
      right_source: 'public_consideration', operational_status: 'active', realization_status: 'realized', area_built: 100 },
    { id: 'a14', asset_number: '90014', name: 'יחידה ללא שימוש – האלון', record_status: 'existing', physical_type: 'unit', street: 'האלון', house_number: '3',
      holding_purpose: 'reserve', use_domain: 'no_use', right_type: 'ownership',
      right_source: 'public_consideration', operational_status: 'unused', realization_status: 'realized', area_built: 80 },
    // 6. נכס מסחרי מניב
    { id: 'a15', asset_number: '90015', name: 'קיוסק בגינה', record_status: 'existing', physical_type: 'building',
      street: 'הגן', house_number: '', holding_purpose: 'income', use_domain: 'commerce', use_detail: 'kiosk',
      right_type: 'ownership', right_source: 'by_plan', operational_status: 'third_party', area_built: 18 },
    // 7. כמה נכסים על אותה חלקה
    { id: 'a16', asset_number: '90016', name: 'שטח למבני ציבור – חלקה 50', record_status: 'existing', physical_type: 'land',
      planning_designation: 'שב"צ', holding_purpose: 'reserve', use_domain: 'no_use', right_type: 'ownership', right_source: 'by_plan', operational_status: 'vacant' },
    { id: 'a17', asset_number: '90017', name: 'שצ"פ – חלקה 50', record_status: 'existing', physical_type: 'land',
      planning_designation: 'שצ"פ', holding_purpose: 'public_service', use_domain: 'open_space', use_detail: 'public_garden',
      right_type: 'ownership', right_source: 'by_plan', operational_status: 'active' },
    { id: 'a18', asset_number: '90018', name: 'דרך – חלקה 50', record_status: 'existing', physical_type: 'land',
      planning_designation: 'דרך', holding_purpose: 'public_service', use_domain: 'infrastructure', use_detail: 'road',
      right_type: 'ownership', right_source: 'by_plan', operational_status: 'active' },
    // 8. מתחם על כמה חלקות
    { id: 'a19', asset_number: '90019', name: 'מבנה א – קריית השירותים', record_status: 'existing', physical_type: 'building', complex_id: 'c1',
      street: 'המרכז', house_number: '2', holding_purpose: 'internal_use', use_domain: 'municipal_admin', right_type: 'ownership',
      right_source: 'purchase', operational_status: 'active', area_built: 1200 },
    { id: 'a20', asset_number: '90020', name: 'מבנה ב – קריית השירותים', record_status: 'existing', physical_type: 'building', complex_id: 'c1',
      street: 'המרכז', house_number: '4', holding_purpose: 'public_service', use_domain: 'welfare_health', right_type: 'ownership',
      right_source: 'purchase', operational_status: 'renovation', area_built: 800 }
  ],
  asset_parcels: [
    ['a1', 'p4'], ['a2', 'p4'], ['a3', 'p5'], ['a7', 'p6'], ['a8', 'p8'], ['a9', 'p7'],
    ['a10', 'p7'], ['a11', 'p7'], ['a12', 'p7'], ['a13', 'p7'], ['a14', 'p7'],
    ['a16', 'p8'], ['a17', 'p8'], ['a18', 'p8'],
    ['a19', 'p1'], ['a19', 'p2'], ['a20', 'p2'], ['a20', 'p3']
  ],
  asset_holdings: [
    { id: 'o1', asset_id: 'a2', holder_id: 'h1', holding_method: 'allocation', use_detail: 'talmud_torah', start_date: '2020-09-01', end_date: '2030-08-31', agreement_status: 'valid' },
    { id: 'o2', asset_id: 'a15', holder_id: 'h2', holding_method: 'rent', use_detail: 'kiosk', start_date: '2024-01-01', end_date: '2026-12-31', agreement_status: 'valid' },
    { id: 'o3', asset_id: 'a13', holder_id: 'h3', holding_method: 'municipal_use', use_detail: 'welfare_office', agreement_status: 'none' }
  ],
  considerations: [
    { id: 'k1', process_number: 'TM-0007', project_name: 'בניין מגורים השקד 12', address: 'השקד 12', developer: 'יזם לדוגמה א',
      request_number: '202000001', has_commitment: true, promised_area: 110, promised_yard_area: 40, planned_use: 'גן ילדים',
      has_permit: true, permit_date: '2019-05-01', has_form4: true, form4_date: '2021-10-10', stage: 'delivered', handover_status: 'נמסר והתקבלה חזקה',
      actual_use: 'גן ילדים', is_vacant: false, area_match: 'match' },
    { id: 'k2', process_number: 'TM-0008', project_name: 'פרויקט הדקל', address: 'הדקל 8', developer: 'יזם לדוגמה ב',
      request_number: '202400123', has_commitment: true, promised_area: 500, promised_yard_area: 150, planned_use: 'טרם הוחלט',
      has_permit: true, permit_date: '2025-03-01', has_form4: false, stage: 'construction', area_match: 'not_checked',
      required_action: 'לוודא התאמת תכניות לשטח שהובטח', priority: 'medium' },
    { id: 'k3', process_number: 'TM-0004', project_name: 'פרויקט האלון', address: 'האלון 3', developer: 'יזם לדוגמה ג',
      request_number: '201900456', has_commitment: true, promised_area: 500, promised_yard_area: 120, planned_use: 'מבני חינוך',
      has_permit: true, permit_date: '2020-01-15', has_form4: true, form4_date: '2023-06-01', stage: 'delivered', handover_status: 'נמסר',
      actual_use: 'חינוך ורווחה', is_vacant: false, area_match: 'shortage', required_action: 'בירור חוסר של 30 מ"ר מול היזם', priority: 'high' }
  ],
  consideration_assets: [
    ['k1', 'a7', 'realized'], ['k2', 'a8', 'commitment'], ['k3', 'a9', 'commitment'],
    ['k3', 'a10', 'realized'], ['k3', 'a11', 'realized'], ['k3', 'a12', 'realized'], ['k3', 'a13', 'realized'], ['k3', 'a14', 'realized']
  ],
  consideration_surveys: [
    { id: 's1', consideration_id: 'k3', survey_date: '2026-10-20', surveyor: 'בודק לדוגמה', located: true, physical_condition: 'good',
      delivered_to_city: true, city_holds: true, is_vacant: false, current_use: 'גנים, מעון ולשכת רווחה', found_area: 470,
      area_match: 'shortage', defects: 'יחידה אחת ללא שימוש', required_action: 'הקצאת היחידה הפנויה', priority: 'high' }
  ]
};
