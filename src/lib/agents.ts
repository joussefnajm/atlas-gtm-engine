import { say, audit, wsById, now } from "./store";
import { score } from "./scoring";
import { makeDrafts, review } from "./outreach";
import { spend } from "./meter";
import { inferIcp, enrichDomain } from "./llm";
import type { Draft, Lead, State } from "./types";

/**
 * Multi-agent run. The four roles mirror the ecosystem agents (see seed.agents):
 * Planner (strategic consultant) -> Builder (engineer + platform) -> Reviewer (legal + quality) -> Security -> approval gateway (WhatsApp agent + founder).
 * Every check below is executable code, not a narrated step.
 */
export async function runPipeline(s: State, wsId: string) {
  const ws = wsById(wsId);
  s.log = s.log.filter((m) => m.ws !== wsId);
  // Planner
  say(s, wsId, "Planner", "plan", `Intake received for "${ws.product.name}". Milestones: 1) infer ICP, 2) match accounts with cited evidence, 3) enrich contacts, 4) draft sequences, 5) review facts and security, 6) hold every message at the human gate.`);

  // Builder: ICP
  if (await spend(s, wsId, "icp_inferred")) {
    const r = await inferIcp(ws);
    s.mode = r.mode;
    s.icp = { ...(s.icp ?? {}), [wsId]: r.icp };
    say(s, wsId, "Builder", "action", `ICP inferred in ${r.mode} mode with ${r.icp.fields.length} fields and ${r.icp.expansion.length} expansion segments.${r.error ? " Live call failed, used cache: " + r.error : ""}`, r.tokens);
  } else say(s, wsId, "Metering", "alert", "Credit balance too low for ICP inference; using the cached ICP.");

  // Builder: discovery and scoring
  const existing = new Map(s.leads.filter((l) => l.ws === wsId).map((l) => [l.accountId, l]));
  let created = 0;
  for (const a of ws.accounts) {
    if (existing.has(a.id)) continue;
    if (!(await spend(s, wsId, "lead_discovered"))) { say(s, wsId, "Metering", "alert", "Credits exhausted during discovery; remaining accounts skipped."); break; }
    const sc = score(a);
    const lead: Lead = { ws: wsId, accountId: a.id, stage: "matched", owner: "ai", score: sc.total, tier: sc.tier, fit: sc.fit, intent: sc.intent, enrichment: { status: "pending", note: "not enriched yet" }, variant: created % 2 === 0 ? "v1" : "v2", updatedAt: now() };
    s.leads.push(lead); created++;
  }
  const mine = s.leads.filter((l) => l.ws === wsId);
  const tiers = { A: mine.filter((l) => l.tier === "A").length, B: mine.filter((l) => l.tier === "B").length, C: mine.filter((l) => l.tier === "C").length };
  say(s, wsId, "Builder", "action", `Matched ${mine.length} accounts, each with at least one public source. Tiers: A ${tiers.A}, B ${tiers.B}, C ${tiers.C}. Out-of-region accounts stay in tier C.`);

  // Enrichment
  let enriched = 0;
  for (const l of mine.filter((x) => x.tier !== "C" && x.enrichment.status === "pending")) {
    const a = ws.accounts.find((x) => x.id === l.accountId)!;
    if (!(await spend(s, wsId, "lead_enriched"))) { say(s, wsId, "Metering", "alert", "Enrichment gated: credit limit reached."); break; }
    l.enrichment = await enrichDomain(a.domain ?? "");
    enriched++;
  }
  say(s, wsId, "Builder", "action", `Enrichment attempted for ${enriched} accounts. Without a provider key the status stays "skipped" and no address is invented.`);

  // Outreach drafts
  const hosts = new Set<string>(["forceenergy.online"]);
  for (const a of ws.accounts) for (const sg of a.signals) { try { hosts.add(new URL(sg.url).hostname.replace(/^www\./, "")); } catch {} }
  let drafted = 0, flagged = 0;
  for (const l of mine.filter((x) => x.tier !== "C")) {
    if (s.drafts.some((d) => d.ws === wsId && d.accountId === l.accountId)) continue;
    const a = ws.accounts.find((x) => x.id === l.accountId)!;
    for (const d of makeDrafts(ws, a, l)) {
      if (!(await spend(s, wsId, "outreach_drafted"))) { say(s, wsId, "Metering", "alert", "Drafting gated: credit limit reached."); break; }
      await spend(s, wsId, "outreach_reviewed");
      const r = review(d, a, ws, [...hosts]);
      d.review = r;
      if (r.facts === "flag" || r.security === "flag") flagged++;
      s.drafts.push(d); drafted++;
    }
  }
  say(s, wsId, "Reviewer", "check", `Checked ${drafted} drafts against evidence: every URL must be a cited source and every number must appear in the evidence or the intake. ${flagged} flagged for a human.`);
  say(s, wsId, "Security", "check", `Scanned ${drafted} drafts for unlisted links, contact data, secrets, missing opt-out line and AI tool names. Allowed hosts: ${[...hosts].slice(0, 6).join(", ")}${hosts.size > 6 ? "…" : ""}.`);
  const pending = s.drafts.filter((d) => d.ws === wsId && d.status === "pending").length;
  say(s, wsId, "Approval gateway", "hitl", `${pending} messages wait for a human decision. Nothing is sent without approval; the queue goes to the founder through the WhatsApp agent as one numbered list.`);
  s.ran[wsId] = now();
  audit(s, "engine", "pipeline_run", `${ws.id}: ${mine.length} accounts, ${drafted} drafts, ${flagged} flagged`);
}

export function decide(s: State, id: string, action: "approve" | "reject" | "edit", actor: string, text?: string) {
  const d = s.drafts.find((x) => x.id === id); if (!d) return null;
  if (action === "approve") d.status = "approved";
  if (action === "reject") d.status = "rejected";
  if (action === "edit") { d.editedBody = text; d.status = "edited"; }
  d.decidedBy = actor; d.decidedAt = now();
  audit(s, actor, `draft_${action}`, `${d.id} (${d.toRole})`);
  return d;
}

export async function dispatch(s: State, id: string) {
  const d = s.drafts.find((x) => x.id === id);
  if (!d || !["approved", "edited"].includes(d.status)) return { ok: false, reason: "Only approved drafts can be dispatched." };
  if (!(await spend(s, d.ws, "outreach_sent"))) return { ok: false, reason: "Credit limit reached; dispatch gated." };
  d.status = "sent";
  const lead = s.leads.find((l) => l.ws === d.ws && l.accountId === d.accountId);
  if (lead && lead.stage === "matched") { lead.stage = "contacted"; lead.updatedAt = now(); lead.owner = "ai"; }
  audit(s, "engine", "dispatch_dry_run", `${d.id} via ${d.channel}: logged as sent in dry-run mode; connect a sender to deliver`);
  return { ok: true, reason: "Dry run: recorded with timestamp. No message left the system." };
}
