import fs from "node:fs";
import path from "node:path";
import { audit, now, wsById } from "./store";
import { decide } from "./agents";
import { spend } from "./meter";
import type { Draft, State } from "./types";

/**
 * Integration with the WhatsApp agent (YO WASAP). File contract, no secrets, works with the folder the agent already reads:
 *   OUT  gtm_cola_<ws>.json + gtm_cola_<ws>.md   numbered approval list the agent shows the founder once a day
 *   IN   gtm_decisiones.json                     [{ "ref": 3, "decision": "approve" | "reject" | "edit", "text": "optional edited body" }]
 * Set YOWASAP_DIR to the shared folder; default is ./data/yowasap.
 */
export const dir = () => process.env.YOWASAP_DIR || path.join(process.cwd(), "data", "yowasap");

export async function exportQueue(s: State, wsId: string) {
  const ws = wsById(wsId);
  const pending = s.drafts.filter((d) => d.ws === wsId && d.status === "pending" && d.review.facts === "ok" && d.review.security === "ok");
  const held = s.drafts.filter((d) => d.ws === wsId && d.status === "pending" && (d.review.facts === "flag" || d.review.security === "flag"));
  let ref = 1;
  const items = pending.map((d) => { d.queue = { exportedAt: now(), ref: ref++ }; return d; });
  fs.mkdirSync(dir(), { recursive: true });
  const lines: string[] = [`# Cola de aprobación GTM · ${ws.label} · ${new Date().toISOString().slice(0, 10)}`, "", "Responde por número: `3 sí`, `3 no` o `3 editar: texto nuevo`. Nada sale sin tu respuesta.", ""];
  for (const d of items) {
    const a = ws.accounts.find((x) => x.id === d.accountId)!;
    const lead = s.leads.find((l) => l.ws === wsId && l.accountId === d.accountId)!;
    lines.push(`**${d.queue!.ref}.** [Tier ${lead.tier} · ${lead.score}] ${d.toRole} · ${d.channel} · toque ${d.touch}${d.subject ? " · Asunto: " + d.subject : ""}`, `> ${d.body}`, `Fuente: ${d.sources[0]}`, "");
    void a;
  }
  if (held.length) lines.push(`_${held.length} borradores retenidos por la revisión (hechos o seguridad); no se muestran._`);
  fs.writeFileSync(path.join(dir(), `gtm_cola_${wsId}.md`), lines.join("\n"));
  fs.writeFileSync(path.join(dir(), `gtm_cola_${wsId}.json`), JSON.stringify(items.map((d) => ({ ref: d.queue!.ref, id: d.id, tier: s.leads.find((l) => l.ws === wsId && l.accountId === d.accountId)!.tier, to: d.toRole, channel: d.channel, touch: d.touch, subject: d.subject, body: d.body, source: d.sources[0] })), null, 1));
  await spend(s, wsId, "approval_exported", items.length || 1);
  audit(s, "engine", "queue_exported", `${items.length} drafts to ${dir()} (${held.length} held by review)`);
  return { exported: items.length, held: held.length, dir: dir() };
}

export async function importDecisions(s: State, wsId: string) {
  const f = path.join(dir(), "gtm_decisiones.json");
  if (!fs.existsSync(f)) return { applied: 0, note: `No decisions file yet at ${f}` };
  const list = JSON.parse(fs.readFileSync(f, "utf8")) as { ref: number; decision: "approve" | "reject" | "edit"; text?: string }[];
  let applied = 0;
  for (const x of list) {
    const d: Draft | undefined = s.drafts.find((y) => y.ws === wsId && y.queue?.ref === x.ref && y.status === "pending");
    if (!d) continue;
    if (decide(s, d.id, x.decision, "founder via WhatsApp agent", x.text)) applied++;
  }
  fs.renameSync(f, f.replace(".json", `.applied-${Date.now()}.json`));
  return { applied, note: "Decisions applied and the file archived" };
}
