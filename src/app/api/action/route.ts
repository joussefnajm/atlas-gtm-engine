import { NextResponse } from "next/server";
import { load, save, audit, now } from "@/lib/store";
import { decide, dispatch } from "@/lib/agents";
import { exportQueue, importDecisions } from "@/lib/yowasap";
import type { Stage } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await req.json();
  const s = load();
  let result: any = { ok: true };
  switch (b.type) {
    case "grant": s.meter.balance += 100; s.meter.granted += 100; audit(s, "founder (web)", "credit_grant", "+100 credits (demo grant, mirrors a Flexprice wallet top-up)"); break;
    case "setWs": s.activeWs = b.ws; break;
    case "approve": case "reject": decide(s, b.id, b.type, "founder (web)"); break;
    case "edit": decide(s, b.id, "edit", "founder (web)", b.text); break;
    case "dispatch": result = await dispatch(s, b.id); break;
    case "dispatchAll": {
      let n = 0;
      for (const d of s.drafts.filter((x) => x.ws === b.ws && ["approved", "edited"].includes(x.status))) { const r = await dispatch(s, d.id); if (r.ok) n++; }
      result = { ok: true, sent: n }; break;
    }
    case "stage": {
      const l = s.leads.find((x) => x.ws === b.ws && x.accountId === b.accountId);
      if (l) { l.stage = b.stage as Stage; l.owner = b.owner ?? "rep"; l.updatedAt = now(); l.sandbox = b.sandbox ?? l.sandbox; audit(s, b.owner === "ai" ? "engine" : "rep", "stage_change", `${l.accountId} → ${b.stage}${b.sandbox ? " (sandbox)" : ""}`); }
      break;
    }
    case "icp": s.accepted[b.id] = b.status; audit(s, "founder (web)", `icp_${b.status}`, b.id); break;
    case "addEdge": s.extraEdges.push({ ws: b.ws, from: b.from, to: b.to, type: "PREVIOUSLY_EMPLOYED_AT", note: b.note || "added by the team" }); audit(s, "founder (web)", "network_edge_added", `${b.from} → ${b.to}`); break;
    case "exportQueue": result = await exportQueue(s, b.ws); break;
    case "importDecisions": result = await importDecisions(s, b.ws); break;
    default: result = { ok: false, error: "unknown action" };
  }
  save(s);
  return NextResponse.json(result);
}
