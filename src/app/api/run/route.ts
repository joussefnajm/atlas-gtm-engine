import { NextResponse } from "next/server";
import { load, save } from "@/lib/store";
import { runPipeline } from "@/lib/agents";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  const { ws, reset } = await req.json();
  const s = load();
  if (reset) {
    s.leads = s.leads.filter((l) => l.ws !== ws); s.drafts = s.drafts.filter((d) => d.ws !== ws); s.log = s.log.filter((m) => m.ws !== ws);
    s.extraEdges = s.extraEdges.filter((e) => e.ws !== ws); delete s.ran[ws];
  }
  s.activeWs = ws;
  await runPipeline(s, ws);
  save(s);
  return NextResponse.json({ ok: true });
}
