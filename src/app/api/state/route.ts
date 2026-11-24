import { NextResponse } from "next/server";
import { load, SEED, wsById } from "@/lib/store";
import { summary } from "@/lib/meter";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = load();
  const ws = new URL(req.url).searchParams.get("ws") || s.activeWs;
  const w = wsById(ws);
  return NextResponse.json({
    activeWs: ws,
    workspaces: SEED.workspaces.map((x) => ({ id: x.id, label: x.label, accounts: x.accounts.length })),
    workspace: { id: w.id, label: w.label, product: w.product, competitors: w.competitors, accounts: w.accounts, marketSignals: w.marketSignals },
    icp: s.icp?.[ws] ?? w.icp,
    mode: s.mode, ranAt: s.ran[ws] ?? null,
    accepted: s.accepted,
    leads: s.leads.filter((l) => l.ws === ws),
    drafts: s.drafts.filter((d) => d.ws === ws),
    log: s.log.filter((m) => m.ws === ws),
    audit: s.audit.slice(0, 80),
    meter: { ...summary(s), events: s.meter.events.slice(0, 40) },
    agents: SEED.agents, meta: SEED.meta,
    integrations: {
      llm: !!process.env.ANTHROPIC_API_KEY, tavily: !!process.env.TAVILY_API_KEY, hunter: !!process.env.HUNTER_API_KEY,
      flexprice: !!process.env.FLEXPRICE_API_KEY, nexla: !!process.env.NEXLA_NEXSET_URL, teamily: !!process.env.TEAMILY_WEBHOOK_URL,
      yowasapDir: process.env.YOWASAP_DIR || "./data/yowasap",
    },
  });
}
