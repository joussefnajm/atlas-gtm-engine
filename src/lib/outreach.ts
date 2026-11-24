import type { Account, Draft, Lead, Workspace } from "./types";

const OPT_OUT_ES = "Si prefiere no recibir mensajes, responda «no» y no volvemos a escribir.";
const OPT_OUT_EN = "If you prefer not to hear from us, reply \"no\" and we will not write again.";

const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return "public source"; } };

function evidence(a: Account) {
  const s = [...a.signals].sort((x, y) => y.strength - x.strength)[0];
  const clean = (x: string) => x.replace(/\s*\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim();
  return { text: clean(s.text), es: clean(s.textEs ?? s.text), url: s.url, host: host(s.url) };
}

/** Builds a three-touch sequence grounded only in the public signal and the product intake. Nothing here invents a claim. */
export function makeDrafts(ws: Workspace, a: Account, lead: Lead): Draft[] {
  const ev = evidence(a);
  const role = a.roles[0];
  const v = lead.variant;
  const base = (touch: number, channel: Draft["channel"], body: string, english: string, subject?: string): Draft => ({
    id: `${ws.id}-${a.id}-t${touch}`, ws: ws.id, accountId: a.id, touch, channel, variant: v, toRole: `${role} at ${a.name}`,
    subject, body, english, sources: [ev.url], status: "pending", review: { facts: "ok", security: "ok", notes: [] },
  });
  const seen = `Lo que vi públicamente (${ev.host}): «${ev.es}».`;
  const angleEs = a.angleEs ?? a.angle;
  const seenEn = `What I saw publicly (${ev.host}): "${ev.text}".`;

  // Force Energy
  const t1 = v === "v1"
    ? `Buenos días. ${seen} Force Energy diseña, instala y legaliza sistemas solares y de almacenamiento en Santander, con 41 proyectos entregados y 528 kWp. ${angleEs} Podemos conversar con quien lleve el área técnica o de mantenimiento de ${a.name}? ${OPT_OUT_ES}`
    : `Buenos días. Con la factura de energía de ${a.name} podemos darle un dimensionamiento preliminar, sujeto a visita técnica. Force Energy ha entregado 41 proyectos y 528 kWp en Santander. Le enviamos el formulario? ${OPT_OUT_ES}`;
  const e1 = v === "v1"
    ? `Good morning. ${seenEn} Force Energy designs, installs and files solar and storage systems in Santander, with 41 projects delivered and 528 kWp. Could we speak with whoever runs technical or maintenance at ${a.name}? ${OPT_OUT_EN}`
    : `Good morning. With ${a.name}'s energy bill we can give a preliminary sizing, subject to a site visit. Force Energy has delivered 41 projects and 528 kWp in Santander. Shall we send the form? ${OPT_OUT_EN}`;
  return [
    base(1, "email", t1, e1, `Energía solar para ${a.name}`),
    base(2, "linkedin", `Hola, escribí a ${a.name} sobre un dimensionamiento solar preliminar. Si es el contacto correcto, con gusto lo conversamos. ${OPT_OUT_ES}`, `Hi, I wrote to ${a.name} about a preliminary solar sizing. If you are the right contact, happy to talk. ${OPT_OUT_EN}`),
  ];
}

/** Reviewer checks: every URL and number must be traceable to the evidence or the product intake; no unsupported claims. */
export function review(d: Draft, a: Account, ws: Workspace, allowedHosts: string[]) {
  const notes: string[] = [];
  const text = d.body;
  const known = (a.signals.map((s) => s.text + " " + (s.textEs ?? "")).join(" ") + " " + (a.angleEs ?? "") + " " + ws.product.intake + " " + a.angle + " " + a.name + " " + a.city).toLowerCase();
  let facts: "ok" | "flag" = "ok";
  for (const url of d.sources) {
    if (!a.signals.some((s) => s.url === url)) { facts = "flag"; notes.push(`Source not in evidence: ${url}`); }
  }
  for (const n of text.match(/\d[\d.,]*/g) ?? []) {
    if (!known.includes(n.toLowerCase())) { facts = "flag"; notes.push(`Number "${n}" is not in the evidence or intake`); }
  }
  const banned = /(garantiz|guarantee|100\s?%|ahorra(rá)?\s+\d|aumenta(rá)? tus ventas|gratis para siempre)/i;
  if (banned.test(text)) { facts = "flag"; notes.push("Unsupported promise detected"); }
  let security: "ok" | "flag" = "ok";
  for (const u of text.match(/https?:\/\/[^\s)»"]+/g) ?? []) {
    const h = host(u);
    if (!allowedHosts.includes(h)) { security = "flag"; notes.push(`Link to unlisted host ${h}`); }
  }
  if (/[\w.+-]+@[\w-]+\.[\w.]+|\+?\d[\d\s().-]{8,}\d/.test(text)) { security = "flag"; notes.push("Personal contact data in body"); }
  if (/(sk-[A-Za-z0-9]{10,}|api[_-]?key|password|contraseña)/i.test(text)) { security = "flag"; notes.push("Possible secret in body"); }
  if (!/(responda «no»|reply "no")/i.test(text)) { security = "flag"; notes.push("Missing opt-out line (CAN-SPAM / Ley 1581)"); }
  if (/(claude|anthropic|chatgpt|openai)/i.test(text)) { security = "flag"; notes.push("Names a specific AI tool"); }
  const max = d.channel === "email" ? 900 : 700;
  if (text.length > max) { facts = "flag"; notes.push(`Too long for ${d.channel} (${text.length} characters)`); }
  return { facts, security, notes };
}
