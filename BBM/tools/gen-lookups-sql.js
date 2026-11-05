// יוצר את supabase/002_lookups.sql מתוך js/lookups.js. הרצה: node tools/gen-lookups-sql.js
const fs = require('fs'); const path = require('path');
const window = {}; eval(fs.readFileSync(path.join(__dirname, '../js/lookups.js'), 'utf8'));
const q = s => s == null ? 'null' : "'" + String(s).replace(/'/g, "''") + "'";
let out = '-- נוצר אוטומטית מ-js/lookups.js. אין לערוך ידנית.\n';
out += 'insert into public.lookup_values (list_name, code, label, parent_code, sort_order) values\n';
const rows = [];
for (const [list, items] of Object.entries(window.BBM_LOOKUPS))
  items.forEach(([code, label, parent], i) => rows.push(`(${q(list)}, ${q(code)}, ${q(label)}, ${q(parent)}, ${i})`));
out += rows.join(',\n') + '\non conflict (list_name, code) do update set label = excluded.label, parent_code = excluded.parent_code, sort_order = excluded.sort_order;\n';
fs.writeFileSync(path.join(__dirname, '../supabase/002_lookups.sql'), out);
console.log(rows.length + ' rows');
