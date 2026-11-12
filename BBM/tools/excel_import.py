#!/usr/bin/env python3
"""
BBM – המרת "ניהול נכסים.xlsx" לקובץ ייבוא (JSON) + דוח ייבוא (CSV).

הכללים: מסמך "מיפוי-ייבוא-אקסל.md" (סעיפים 2–6).
הקובץ לא נוגע במסד הנתונים. את ה-JSON טוענים בדף import.html באתר (מנהל בלבד).
הפלט מכיל נתוני אמת – לא שומרים אותו במאגר הקוד (הוא ציבורי).

שימוש:
  python3 excel_import.py <xlsx> <out_dir> [--trial]
"""
import json, re, sys, csv, datetime, collections
import warnings
warnings.filterwarnings("ignore")
import openpyxl

SRC_FILE = "ניהול נכסים.xlsx (עותק 5.11.2026)"
report = []  # (גיליון, שורה, נכס, עמודה, ערך מקורי, מה נעשה)


def note(sheet, row, asset, col, val, what):
    report.append([sheet, row, asset, col, "" if val is None else str(val), what])


def clean(v):
    if v is None:
        return None
    if isinstance(v, str):
        if v.startswith("#") and v.endswith("!"):  # שגיאת נוסחה באקסל (#VALUE!)
            return None
        v = re.sub(r"[ \t ]+", " ", v).strip()
        v = "\n".join(l.strip() for l in v.split("\n")).strip()
        return v or None
    return v


DASHES = {"-", "−", "─", "–", "—"}


def num(v, ctx, col):
    """מספר נקי, או None. מחזיר (ערך, הערה)."""
    v = clean(v)
    if v is None:
        return None, None
    if isinstance(v, (int, float)):
        return float(v), None
    if v in DASHES:
        return None, "dash"
    m = re.fullmatch(r"(?:כ-?|כ ?|~)\s*(\d+(?:\.\d+)?)", v)
    if m:
        note(*ctx, col, v, "נשמר כמספר משוער")
        return float(m.group(1)), f"{col}: {v} (משוער)"
    m = re.fullmatch(r"(\d+(?:\.\d+)?)\s*(?:מ\"ר|מ''ר|מר)?", v)
    if m:
        return float(m.group(1)), None
    note(*ctx, col, v, "טקסט – הועבר להערות")
    return None, f"{col}: {v}"


YES = {"יש", "√", "v", "V", "כן", "✓", "✔", "הסכם"}
NO = {"אין", "איו", "x", "X", "לא", "✗"}


def yn(v, ctx, col):
    """כן/לא. מחזיר (bool|None, הערה)."""
    v = clean(v)
    if v is None:
        return None, None
    s = str(v)
    first = s.split("\n")[0].strip()
    rest = s[len(s.split("\n")[0]):].strip()
    if first in YES or first.startswith("יש ") or first.startswith("√"):
        return True, (f"{col}: {s}" if rest or first not in YES or first == "הסכם" else None)
    if first in NO or first.startswith("אין ") or first.startswith("X"):
        return False, (f"{col}: {s}" if rest or first not in NO else None)
    note(*ctx, col, s, "לא פוענח כן/לא – הועבר להערות")
    return None, f"{col}: {s}"


def date(v, ctx, col):
    v = clean(v)
    if v is None:
        return None, None
    if isinstance(v, datetime.datetime):
        return v.date().isoformat(), None
    if isinstance(v, datetime.date):
        return v.isoformat(), None
    return None, None


def split_address(addr):
    """'גיבורי ישראל 15 (פינת ...)' → (רחוב, מספר, הערה)."""
    addr = clean(addr)
    if not addr:
        return None, None, None
    addr = str(addr).replace("\n", " ")
    paren = None
    m = re.search(r"\((.*?)\)", addr)
    if m:
        paren = m.group(1).strip()
        addr = (addr[:m.start()] + addr[m.end():]).strip()
    m = re.match(r"^(.*?)\s+(\d+[א-ת]?(?:\s*[-–]\s*\d+[א-ת]?)?)$", addr)
    if m:
        return m.group(1).strip(), m.group(2).replace(" ", ""), paren
    return addr, None, paren


def parcels_from(gush, helka, sub=None):
    """'10,81 (מגרש 801,802)' → [(gush, '10'), (gush, '81')], הערה."""
    gush, helka = clean(gush), clean(helka)
    if gush is None or helka is None:
        return [], None
    g = str(int(gush)) if isinstance(gush, float) else str(gush)
    h = str(int(helka)) if isinstance(helka, float) else str(helka)
    extra = None
    m = re.search(r"\((.*?)\)", h)
    if m:
        extra = m.group(1).strip()
        h = (h[:m.start()] + h[m.end():]).strip()
    s = clean(sub)
    s = "" if s is None else (str(int(s)) if isinstance(s, float) else str(s))
    out = [(g.strip(), p.strip(), s) for p in re.split(r"[,/+ו]|\s+", h) if p.strip().isdigit()]
    if not out:
        return [], f"גוש/חלקה: {gush}/{helka}"
    return out, (f"מגרש/הערה לחלקה: {extra}" if extra else None)


# --- "סוג הנכס" (מאגר) ---
TYPE_MAP = {
    "ייעוד ציבורי בבניין פרטי": ("unit", "public_service", "public_consideration"),
    "בנין ציבורי": ("building", "public_service", "unknown"),
    "קרקע בייעוד חום": ("land", "public_service", "unknown"),
}

# --- "שימוש בנכס" (תמורות): שלב, רשומה, תחום, מצב ---
USE_MAP = {
    "בתהליך": ("construction", "future", "unknown", "under_construction"),
    "ללא היתר": ("commitment", "future", "unknown", "unknown"),
    "גן ילדים": ("delivered", "existing", "education", "active"),
    "מקום לא בשימוש": ("delivered", "existing", "no_use", "unused"),
    "שימוש עירוני": ("delivered", "existing", "municipal_admin", "active"),
    "בביצוע": ("construction", "future", "BY_NOTE", "under_construction"),
    "פלישה": ("delivered", "existing", "unknown", "trespass"),
    "צרכי ציבור פרטי": ("delivered", "existing", "BY_NOTE", "third_party"),
}

DETAIL_WORDS = [  # (מילה ב"באור", use_detail, use_domain)
    ("גן", "kindergarten", "education"), ("מעון", "daycare", "education"),
    ("תלמוד תורה", "talmud_torah", "education"), ('ת"ת', "talmud_torah", "education"),
    ("בית ספר", "school", "education"), ("בית כנסת", "synagogue", "community"),
    ("ביהכ\"נ", "synagogue", "community"), ("מועדון", "community_center", "community"),
    ("ספרי", "library", "community"), ("רווחה", "welfare_office", "welfare_health"),
    ("מרפא", "clinic", "welfare_health"), ("לשכת הרב", "rabbinate", "municipal_admin"),
    ("לשכת רב", "rabbinate", "municipal_admin"), ("מחסן", "warehouse", "storage"),
]


def detail_from_note(txt):
    if not txt:
        return None, None
    for w, d, dom in DETAIL_WORDS:
        if w in txt:
            return d, dom
    return None, None


def norm_use(v):
    v = clean(v)
    if v is None:
        return None
    v = v.replace("בהתליך", "בתהליך")
    for k in USE_MAP:
        if v.startswith(k):
            return k
    return v


DEVELOPER_FIX = {"אזרי הנגב": "ארזי הנגב"}


def norm_dev(v):
    v = clean(v)
    if not v:
        return None
    for a, b in DEVELOPER_FIX.items():
        v = v.replace(a, b)
    return v


AREA_KEYS = [("40%", "area_floor40"), ("ועד", "area_committee"), ("היתר", "permit_area"), ("התחייב", "area_commitment")]


def area_match(v, ctx):
    v = clean(v)
    out = {}
    if not v:
        return out, None
    leftover = []
    for line in v.split("\n"):
        line = line.strip(" •\t")
        if not line:
            continue
        key = next((f for k, f in AREA_KEYS if k in line.split("=")[0]), None)
        val = line.split("=", 1)[1].strip() if "=" in line else line
        if key and "=" in line:
            if not val:
                continue
            m = re.fullmatch(r"(\d+(?:\.\d+)?)\s*(?:מ\"ר)?", val)
            if m:
                out[key] = float(m.group(1))
                continue
        leftover.append(line)
    if leftover:
        note(*ctx, "תאימות שטחים", v, "חלק לא פוענח – נשמר בהערת תאימות")
        return out, v
    return out, None


def main(xlsx, out_dir, trial):
    wb = openpyxl.load_workbook(xlsx)
    reg = wb["מאגר נכסים"]
    tmr = wb["תמורות"]

    def rows(ws):
        hdr = [clean(c.value) for c in ws[1]]
        for i, r in enumerate(ws.iter_rows(min_row=2), start=2):
            vals = {hdr[j]: r[j].value for j in range(len(hdr)) if hdr[j]}
            vals["_cells"] = {hdr[j]: r[j] for j in range(len(hdr)) if hdr[j]}
            if all(clean(v) is None for k, v in vals.items() if k != "_cells"):
                continue
            yield i, vals

    assets = {}       # asset_number → dict
    asset_parcels = []  # (asset_number, gush, helka, sub)
    holders = []

    # ---------- מאגר נכסים ----------
    for i, r in rows(reg):
        an = clean(r["מספר נכס"])
        if an is None:
            continue
        an = str(int(an)) if isinstance(an, (int, float)) else str(an)
        ctx = ("מאגר נכסים", i, an)
        t = clean(r["סוג הנכס"])
        desc = clean(r["תאור הנכס"])
        if t == "ייעוד שאינו ציבורי בבעלות עירייה":
            ph = "unit" if desc and "מגדל" in desc else "building"
            pt = (ph, "income", "unknown")
        else:
            pt = TYPE_MAP.get(t, ("other", "unknown", "unknown"))
            if t not in TYPE_MAP:
                note(*ctx, "סוג הנכס", t, "סוג לא מוכר – 'אחר'")
        notes = []
        if clean(r["באור/הערות/הסברים לנכס"]):
            notes.append(clean(r["באור/הערות/הסברים לנכס"]))
        if clean(r["נכס אב/משנה"]) == "משנה":
            notes.append("באקסל מסומן 'משנה' – לבדיקת נכס האב")
            note(*ctx, "נכס אב/משנה", "משנה", "סומן לבדיקה")
        a = dict(
            asset_number=an, name=desc, physical_type=pt[0], holding_purpose=pt[1], right_source=pt[2],
            record_status="existing", street=split_address(r["רחוב"])[0],
            house_number=None if clean(r["מספר בית"]) is None else str(clean(r["מספר בית"])).replace(".0", ""),
            planning_designation=(clean(r["יעוד קרקע"]) or "").replace("שבצ", 'שב"צ') or None,
            plan_number=None if clean(r["מתכנית"]) is None else str(clean(r["מתכנית"])),
            permit_number=None if clean(r["מס' היתר"]) is None else str(clean(r["מס' היתר"])),
            import_source_file=SRC_FILE, import_source_sheet="מאגר נכסים", import_source_row=i,
        )
        for col, key in (("שטח בנוי", "area_built"), ("שטח חצר", "area_yard")):
            v, n = num(r[col], ctx, col)
            if v is not None:
                a[key] = v
            if n and n != "dash":
                notes.append(n)
        ps, pn = parcels_from(r["גוש"], r["חלקה"], r["תת חלקה"])
        for p in ps:
            asset_parcels.append((an, *p))
        if pn:
            notes.append(pn)
        if clean(r["מחזיק בנכס"]):
            holders.append(dict(asset_number=an, name=clean(r["מחזיק בנכס"]), contact_name=clean(r["איש קשר"]),
                                phone=None if r["נייד"] is None else str(clean(r["נייד"])), email=clean(r["מייל"])))
        if split_address(r["רחוב"])[2]:
            a["address_note"] = split_address(r["רחוב"])[2]
        a["_notes"] = notes
        a["_in_registry"] = True
        assets[an] = a

    # ---------- תמורות ----------
    procs = collections.OrderedDict()  # process_number → dict
    links = []      # (process_number, asset_number)
    surveys = []
    for i, r in rows(tmr):
        an = clean(r["מספר נכס"])
        if an is None:
            continue
        an = str(int(an)) if isinstance(an, (int, float)) else str(an)
        ctx = ("תמורות", i, an)
        a = assets.get(an)
        if a is None:
            a = dict(asset_number=an, physical_type="unit", holding_purpose="public_service",
                     right_source="public_consideration", record_status="existing",
                     import_source_file=SRC_FILE, import_source_sheet="תמורות", import_source_row=i,
                     _notes=["נכס שהופיע רק בגיליון התמורות (לא במאגר)"], _in_registry=False)
            note(*ctx, "מספר נכס", an, "לא במאגר – נוצר נכס חדש")
            assets[an] = a
        a["_in_tmr"] = True
        a["_tmr_row"] = i
        # כתובת
        st, hn, paren = split_address(r["כתובת"])
        if st:  # הכתובת בתמורות היא המקור; ברחוב/מספר במאגר יש פיצול נוסחה שבור
            a["street"], a["house_number"] = st, hn
            a.pop("address_note", None)
        if paren:
            a["address_note"] = paren
        if not a.get("name"):
            where = " ".join(x for x in (a.get("street"), a.get("house_number")) if x)
            if a.get("address_note"):
                where += f" ({a['address_note']})"
            a["name"] = f"שטח ציבורי – {where}" if where else f"נכס {an} – לבירור"
        # שכונה, קוד רחוב
        if clean(r["אזור"]):
            a["neighborhood"] = clean(r["אזור"])
        if clean(r["קוד רחוב"]) is not None:
            a["street_code"] = str(clean(r["קוד רחוב"])).replace(".0", "")
        # שטחים
        v, n = num(r["שטח"], ctx, "שטח")
        if v is not None:
            a["area_built"] = v
        if n and n != "dash":
            a["_notes"].append(n)
        v, n = num(r["חצר"], ctx, "חצר")
        if v is not None:
            a["area_yard"] = v
        elif n == "dash":
            a["area_yard"] = 0
        elif n:
            a["_notes"].append(n)
        # שימוש
        use_raw = clean(r["שימוש בנכס"])
        use = norm_use(use_raw)
        expl = clean(r["באור לשימושים"])
        need_check = False
        if use in USE_MAP:
            stage, rec, dom, op = USE_MAP[use]
        else:
            has_f4 = clean(r["טופס 4"])
            stage, rec, dom, op = "unknown", ("existing" if has_f4 and str(has_f4).startswith("יש") else "future"), "unknown", "unknown"
            need_check = True
            note(*ctx, "שימוש בנכס", use_raw, "לא ידוע / לבירור – 'בירור מצב'")
        det, ddom = detail_from_note(expl)
        if dom == "BY_NOTE":
            dom = ddom or "unknown"
        if use == "גן ילדים":
            det = "kindergarten"
        a.update(record_status=rec, use_domain=dom, operational_status=op,
                 right_type="ownership" if stage == "delivered" else "future_right",
                 realization_status="realized" if stage == "delivered" else "commitment")
        if det and dom in (ddom, "education"):
            a["use_detail"] = det
        if expl:
            m = re.search(r"(?<!\d)(\d{6})(?!\d)", expl)
            if m:
                a["institution_code"] = m.group(1)
            a["_notes"].append("באור לשימושים: " + expl)
        if r["_cells"]["מספר נכס"].fill.fill_type != "solid":
            pass  # הצהוב = תיקייה מקומית נפתחה; לא מיובא (סעיף 6)
        # גוש/חלקה
        ps, pn = parcels_from(r["גוש"], r["חלקה"])
        for p in ps:
            if not any(x[0] == an and x[1] == p[0] and x[2] == p[1] for x in asset_parcels):
                asset_parcels.append((an, *p))
        if pn:
            a["_notes"].append(pn)
            if "מגרש" not in pn:
                note(*ctx, "גוש/חלקה", pn, "לא פוענח")

        # ---- תהליך תמורה ----
        req = clean(r["בקשה"])
        req = None if req is None else str(req).replace(".0", "")
        pnum = req if req and re.fullmatch(r"\d{4,}", req) else f"נכס-{an}"
        if pnum.startswith("נכס-"):
            note(*ctx, "בקשה", req, "אין מספר בקשה – תהליך לשורה הזו בלבד")
        p = procs.get(pnum)
        first = p is None
        if first:
            p = dict(process_number=pnum, request_number=req, _notes=[], _stages=[], _uses=[], _actions=[],
                     import_source_row=i)
            procs[pnum] = p
        cn = []
        addr = clean(r["כתובת"])
        addr = addr.replace("\n", " ") if isinstance(addr, str) else addr
        p.setdefault("address", addr)
        if addr and addr != p["address"] and addr not in p["address"]:
            p["address"] += " · " + addr
        dev = norm_dev(r["יזם"])
        if dev and not p.get("developer"):
            p["developer"] = dev
        elif dev and dev != p.get("developer"):
            cn.append(f"יזם בשורת נכס {an}: {dev}")
        for col, key in (("היתר", "has_permit"), ("טופס 4", "has_form4"), ("התחייבות", "has_commitment"),
                         ("התחייבות לבינוי", "developer_builds"), ("ייפוי כוח", "power_of_attorney"),
                         ("סעיף 126", "section_126")):
            v, n = yn(r[col], ctx, col)
            if v is not None and p.get(key) is None:
                p[key] = v
            if n:
                cn.append(n)
        for col, key in (("תאריך היתר", "permit_date"), ("תאריך טופס 4", "form4_date")):
            v, n = date(r[col], ctx, col)
            if v and not p.get(key):
                p[key] = v
            # טקסט בעמודות התאריך ("אין טופס 4" וכד') – מתעלמים (מיפוי, סעיף 3)
        v, n = yn(r["חזקה בנכס"], ctx, "חזקה בנכס")
        if v:
            cn.append("התקבלה חזקה בנכס")
        elif n:
            cn.append(n)
        exp = clean(r["הפקעה"])
        if exp:
            p["expropriation_note"] = (p.get("expropriation_note") + " · " if p.get("expropriation_note") else "") + exp
        pub = clean(r["פרסום 77"])
        if pub and not p.get("publication_77"):
            p["publication_77"] = pub
        am, amn = area_match(r["תאימות שטחים"], ctx)
        for k, v in am.items():
            p.setdefault(k, v)
        if amn:
            if amn not in (p.get("area_match_note") or ""):
                p["area_match_note"] = amn if not p.get("area_match_note") else p["area_match_note"] + "\n" + amn
        plan = clean(r["אפשרויות תכנון והערות"])
        if plan:
            cn.append(plan)
            fc = r["_cells"]["אפשרויות תכנון והערות"].font.color
            if fc is not None and fc.type == "rgb" and fc.rgb == "FFFF0000":
                p["_actions"].append(f"נכס {an}: {plan}")
        if need_check:
            p["_actions"].append(f"נכס {an}: בירור מצב (שימוש '{use_raw or 'ריק'}')")
        p["_stages"].append(stage)
        p["_uses"].append(f"{an}: {use_raw}" if use_raw else f"{an}: —")
        if cn:
            p["_notes"].append((an, "\n".join(cn)))
        links.append((pnum, an))
        # ביקורת
        sv, sn = date(r["ביקורת"], ctx, "ביקורת")
        status = clean(r["סטטוס לתאריך הביקורת"])
        if status and "יש לערוך ביקור" in status:
            p["_actions"].append(f"נכס {an}: יש לערוך ביקור")
        if sv or (status and "יש לערוך ביקור" not in status):
            surveys.append(dict(import_key=f"xlsx-{an}", process_number=pnum, survey_date=sv,
                                notes=f"נכס {an} · " + "\n".join(x for x in (status, sn) if x),
                                current_use=use_raw))

    # סיכום תהליכים
    order = ["delivered", "form4", "construction", "permit", "commitment", "unknown"]
    out_procs = []
    for pnum, p in procs.items():
        st = [s for s in p.pop("_stages")]
        known = [s for s in st if s != "unknown"]
        p["stage"] = collections.Counter(known).most_common(1)[0][0] if known else "unknown"
        p["actual_use"] = "\n".join(p.pop("_uses"))
        acts = p.pop("_actions")
        p["required_action"] = "\n".join(acts) if acts else None
        notes = p.pop("_notes")
        multi_assets = len(st) > 1
        p["notes"] = "\n\n".join((f"[נכס {an}] " if multi_assets else "") + t for an, t in notes) if notes else None
        p["project_name"] = p.get("address")
        out_procs.append({k: v for k, v in p.items() if v is not None})

    # ---------- בחירת מדגם הניסיון ----------
    selected = None
    if trial:
        want = []
        by_use = collections.defaultdict(list)
        for i, r in rows(tmr):
            an = str(clean(r["מספר נכס"])).replace(".0", "")
            by_use[norm_use(r["שימוש בנכס"])].append((an, r))
        def pick(pred, n=1):
            got = 0
            for _, lst in by_use.items():
                for an, r in lst:
                    if got >= n:
                        return
                    if an not in want and pred(an, r):
                        want.append(an)
                        got += 1
        u = lambda name: (lambda an, r: norm_use(r["שימוש בנכס"]) == name)
        pick(lambda an, r: norm_use(r["שימוש בנכס"]) == "גן ילדים" and re.search(r"\d{6}", str(r["באור לשימושים"] or "")), 2)
        for name in ("בתהליך", "ללא היתר", "פלישה", "מקום לא בשימוש", "שימוש עירוני", "בביצוע", "צרכי ציבור פרטי"):
            pick(u(name))
        pick(lambda an, r: an in ("10278", "10935", "10375"), 3)
        pick(lambda an, r: "," in str(r["חלקה"] or ""))
        pick(lambda an, r: isinstance(r["שטח"], str) and not str(r["שטח"]).strip() in DASHES)
        pick(lambda an, r: "אזרי" in str(r["יזם"] or "") or "ארזי" in str(r["יזם"] or ""))
        pick(lambda an, r: num(r["שטח"], ("", 0, an), "")[0] is not None and clean(r["פרסום 77"]) is not None
             and any(k in str(r["תאימות שטחים"] or "") for k in ("1", "2", "3", "4", "5", "6", "7", "8", "9")))
        # בקשה אחת עם כמה יחידות (2–3) – כולה
        cnt = collections.Counter(pn for pn, _ in links if not pn.startswith("נכס-"))
        multi = next((pn for pn, c in cnt.items() if 2 <= c <= 3), None)
        for pn, an in links:
            if pn == multi and an not in want:
                want.append(an)
        selected = set(want[:20])
        report_trial = sorted(selected)
    keep = (lambda an: True) if selected is None else (lambda an: an in selected)

    # ---------- פלט ----------
    out_assets = []
    for an, a in assets.items():
        if not keep(an):
            continue
        if not a.get("_in_tmr") and trial:
            continue
        notes = a.pop("_notes")
        a = {k: v for k, v in a.items() if not k.startswith("_") and v is not None}
        if notes:
            a["notes"] = "\n".join(dict.fromkeys(notes))
        out_assets.append(a)
    names = {a["asset_number"] for a in out_assets}
    used_procs = {pn for pn, an in links if an in names}
    payload = dict(
        source=SRC_FILE, created=datetime.datetime.now().isoformat(timespec="seconds"),
        kind="trial" if trial else "full",
        assets=out_assets,
        asset_parcels=[dict(asset_number=a, gush=g, helka=h, sub_helka=s) for a, g, h, s in asset_parcels if a in names],
        considerations=[p for p in out_procs if p["process_number"] in used_procs],
        consideration_assets=[dict(process_number=pn, asset_number=an) for pn, an in links if an in names],
        surveys=[s for s in surveys if s["process_number"] in used_procs and s["import_key"][5:] in names],
    )
    tag = "ניסיון" if trial else "מלא"
    jp = f"{out_dir}/ייבוא-{tag}.json"
    with open(jp, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=1)
    rp = f"{out_dir}/דוח-ייבוא-{tag}.csv"
    with open(rp, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["גיליון", "שורה", "מספר נכס", "עמודה", "ערך מקורי", "מה נעשה"])
        for row in report:
            if row[2] in names:
                w.writerow(row)
    print(f"{tag}: {len(payload['assets'])} נכסים, {len(payload['considerations'])} תהליכים, "
          f"{len(payload['asset_parcels'])} קישורי חלקה, {len(payload['surveys'])} ביקורות, "
          f"{sum(1 for r in report if r[2] in names)} שורות בדוח")
    if trial:
        print("נכסים במדגם:", ", ".join(report_trial))
    print(jp)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], "--trial" in sys.argv)
