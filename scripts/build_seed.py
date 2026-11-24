import csv, json, sys
sys.stdout.reconfigure(encoding="utf-8")
T = r"C:\Users\jouss\Desktop\TINTO DIGITAL"
fe = json.load(open("data/seed-fe.json", encoding="utf-8"))


def rows(p):
    return list(csv.DictReader(open(p, encoding="utf-8-sig")))


def strength(level):
    l = level.strip().lower()
    return 0.85 if l.startswith("a") or l == "alto" else 0.62 if l.startswith("b") or l == "medio" else 0.4


# Workspace: Tinto Digital wallet loyalty for restaurants (public business information only)
rest = []
for r in rows(T + r"\02_COMERCIAL\PROSPECTOS_BAY_AREA_v0.1.csv"):
    lvl = r["nivel_verificacion"][:1]
    rest.append({
        "id": "r%s" % r["id"], "name": r["nombre"], "city": r["ciudad"], "region": "Bay Area, CA", "inRegion": True,
        "industry": "Restaurant / cafe (Latin American)", "industryFit": 1.0, "size": r["tipo_cocina"],
        "domain": None if "no listado" in r["sitio_web"] else r["sitio_web"],
        "currentVendor": "Toast" if "Toast" in r["presencia_en_listados"] else None,
        "verification": lvl,
        "signals": [{"id": "sr%s" % r["id"], "type": "observed_pain", "text": r["senal_de_dolor_observable"],
                     "date": r["fecha_consulta"], "url": r["fuente_url"], "strength": strength(lvl)}],
        "angle": "Digital wallet loyalty card plus a WhatsApp assistant that answers and captures repeat customers. " + r["por_que_encaja"],
        "roles": ["Owner", "Manager"], "instagram": r["instagram_publico"],
    })

# Workspace: catering and events (pilot restaurant name withheld in the public repo)
orgs = []
for r in rows(T + r"\08_CLIENTES\CASA_JUANA\piloto\PROSPECTOS_CATERING_lista_v0.2.csv"):
    t = r["tipo"]
    keys = ["cámara", "camara", "ong", "asociaci", "iglesia", "organizador", "cowork", "escuela", "universidad"]
    fit = 1.0 if any(k in t.lower() for k in keys) else 0.7
    orgs.append({
        "id": "o%s" % r["id"], "name": r["organizacion"], "city": r["ciudad"], "region": "Bay Area, CA", "inRegion": True,
        "industry": t, "industryFit": fit, "size": "Organization", "domain": r["sitio_web"] or None, "currentVendor": None,
        "verification": r["confianza"][:1].upper(),
        "signals": [{"id": "so%s" % r["id"], "type": "upcoming_event", "text": r["evento_o_fecha"], "date": "2026-11-22",
                     "url": r["fuente_url"], "strength": strength(r["confianza"])}],
        "angle": r["por_que_encaja"], "roles": ["Events coordinator", "Executive director"],
    })

tinto_comp = [
    {"id": "t1", "name": "Loopy Loyalty", "type": "direct", "url": None, "positioning": "Wallet-first loyalty for small business; Apple and Google passes, stamp app.", "pricing": "US$25 / 69 / 95 per month (provider page, Tinto study 2026-11-17)"},
    {"id": "t2", "name": "PassKit", "type": "direct", "url": "https://passkit.com", "positioning": "Wallet pass platform with API and automation; requires own Apple certificate.", "pricing": "From about US$39.50 per month, scales with cards (third-party sources)"},
    {"id": "t3", "name": "Stamp Me", "type": "direct", "url": None, "positioning": "Digital stamp cards for small shops.", "pricing": "US$49 / 79 / 199 (sources conflict)"},
    {"id": "t4", "name": "Square Loyalty", "type": "alternative", "url": None, "positioning": "Loyalty inside the Square POS, with Apple Wallet pass.", "pricing": "About US$45 per month per location (third-party)"},
    {"id": "t5", "name": "Toast Loyalty", "type": "alternative", "url": None, "positioning": "Loyalty module inside the Toast POS.", "pricing": "Quote-based (one source cites about US$185 per month in a bundle)"},
    {"id": "t6", "name": "Thanx / Punchh (PAR)", "type": "indirect", "url": None, "positioning": "Enterprise loyalty for chains.", "pricing": "Quote-based"},
]

tinto_products = [
    {"id": "tinto-wallet", "name": "Tinto Digital · Wallet loyalty + WhatsApp assistant",
     "intake": "Tinto Digital builds custom software and marketing for independent Latin American restaurants in the Bay Area. Core offer: a loyalty card that lives in Apple and Google Wallet (QR sign-up, no app), a WhatsApp assistant that answers customers and captures consented contacts, and a funnel with weekly KPIs. Piloted with one arepa restaurant in San José. Software is custom software owned by Tinto and licensed to the client. Third-party costs such as ads are paid by the client.",
     "lines": ["Wallet loyalty card", "WhatsApp assistant", "Funnel and KPIs", "Marketing plans"]},
    {"id": "tinto-catering", "name": "Tinto Digital · Catering and events engine",
     "intake": "Pilot restaurant catering and corporate events program: combo trays, event quotes through a public 'quote your event' page, and outreach to chambers, churches, dance schools, coworkings and community organizations around San José that have dated events.",
     "lines": ["Event quote page", "Outreach to organizations", "Combo catalog"]},
]


def f(key, label, value, conf, why, naics=None):
    d = {"key": key, "label": label, "value": value, "confidence": conf, "why": why}
    if naics:
        d["naics"] = naics
    return d


wallet_icp = {
    "productId": "tinto-wallet",
    "inferredFrom": ["Tinto Digital wallet market study (2026-11-17)", "pilot restaurant diagnostic", "public prospect list (2026-11-23)"],
    "fields": [
        f("industries", "Target industries", ["Independent Latin American restaurants", "Bakeries and cafes with repeat customers"], 0.88, "Repeat visits are the core of loyalty value; the pilot is an arepa restaurant.", ["722511", "722515", "311811"]),
        f("size", "Company size", "1 to 3 locations, owner-operated, daily sales of about US$1,000 to 2,500 (pilot data point)", 0.7, "Chains buy enterprise tools; owners decide fast."),
        f("personas", "Buyer personas", ["Owner", "Manager"], 0.85, "One decision maker, often reachable on Instagram or WhatsApp."),
        f("triggers", "Trigger events", ["No own website or ordering page", "Few reviews", "No visible loyalty program", "New press coverage", "Heavy delivery-app dependence"], 0.8, "Observed in public listings; each is a reason to talk."),
        f("geo", "Geography", "San José and the South Bay first, then the rest of the Bay Area", 0.9, "The founders and the pilot are there."),
        f("negatives", "Negative signals", ["Chain or franchise", "Agency already managing social media", "Closed or relocated"], 0.72, "Avoids wasted outreach and conflicts."),
    ],
    "expansion": [
        {"id": "x1", "segment": "Event and catering buyers (chambers, churches, dance schools)", "evidence": "37 organizations with dated events were found for the pilot restaurant.", "confidence": 0.8, "status": "suggested"},
        {"id": "x2", "segment": "Latin bakeries and cafes with Instagram-first sales", "evidence": "Several listed businesses sell mainly through Instagram and delivery apps.", "confidence": 0.7, "status": "suggested"},
        {"id": "x3", "segment": "Consultant wallet card for sales networks", "evidence": "The same pass technology can carry a consultant QR for the Force Energy network.", "confidence": 0.66, "status": "suggested"},
    ],
}

cat_icp = {
    "productId": "tinto-catering",
    "inferredFrom": ["pilot restaurant catering strategy", "37-organization public list (2026-11-22)"],
    "fields": [
        f("industries", "Target industries", ["Hispanic chambers", "Community nonprofits", "Churches", "Event organizers", "Coworkings", "Latin dance schools", "Universities"], 0.8, "They run recurring events that need food.", ["813910", "813110", "711310", "531190", "611610"]),
        f("size", "Company size", "Events from 30 to 300 guests", 0.65, "Fits combo trays and a small kitchen."),
        f("personas", "Buyer personas", ["Events coordinator", "Executive director"], 0.78, "They book vendors for galas, mixers and holidays."),
        f("triggers", "Trigger events", ["A dated event in the next 6 weeks", "Holiday posadas", "Annual gala or mixer"], 0.86, "Dates are public and give a real buying window."),
        f("geo", "Geography", "San José, Santa Clara, Silicon Valley", 0.9, "Delivery radius of the kitchen."),
        f("negatives", "Negative signals", ["Exclusive catering contract", "No public contact", "Event already passed"], 0.7, "Skip what cannot convert."),
    ],
    "expansion": [{"id": "x1", "segment": "Corporate holiday parties in Silicon Valley", "evidence": "Coworkings host monthly events with food.", "confidence": 0.6, "status": "suggested"}],
}

out = {"meta": fe["meta"], "workspaces": []}
out["meta"]["note"] = ("Evidence comes from public pages collected between 2026-11-17 and 2026-11-24 and from the Tinto Digital prospect research. "
                       "Names of private individuals and of the pilot restaurant are not included. Anything marked sandbox is simulated.")
out["workspaces"].append({"id": "tinto-wallet", "label": "Tinto Digital · Restaurants", "product": tinto_products[0], "icp": wallet_icp, "competitors": tinto_comp, "accounts": rest, "marketSignals": [], "homeRegion": "Bay Area, CA"})
out["workspaces"].append({"id": "tinto-catering", "label": "Tinto Digital · Catering", "product": tinto_products[1], "icp": cat_icp, "competitors": [], "accounts": orgs, "marketSignals": [], "homeRegion": "Bay Area, CA"})
for a in fe["accounts"]:
    a["inRegion"] = a["region"] == "Santander"
    a["industryFit"] = 1.0 if a["industry"].split(" ")[0].lower() in ("commercial", "agro-industrial", "healthcare") else 0.5
out["workspaces"].append({"id": "fe-solar", "label": "Force Energy · Solar", "product": fe["products"][0], "icp": fe["icp"], "competitors": fe["competitors"], "accounts": fe["accounts"], "marketSignals": fe["marketSignals"], "homeRegion": "Santander"})
out["agents"] = fe["agents"]
out["variants"] = fe["variants"]
json.dump(out, open("data/seed.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print({w["id"]: len(w["accounts"]) for w in out["workspaces"]})
