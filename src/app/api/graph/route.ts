import { NextResponse } from "next/server";
import { load, save } from "@/lib/store";
import { runQuery, graphSnapshot, QUERIES } from "@/lib/graph";
import { spend } from "@/lib/meter";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const s = load();
  const ws = u.searchParams.get("ws") || s.activeWs;
  const q = u.searchParams.get("q");
  if (q && QUERIES[q]) {
    const ok = await spend(s, ws, "graph_query");
    if (!ok) { save(s); return NextResponse.json({ blocked: true, note: "Credit limit reached; graph query gated." }, { status: 402 }); }
    const r = await runQuery(s, ws, q);
    save(s);
    return NextResponse.json(r);
  }
  return NextResponse.json({ ...(await graphSnapshot(s, ws)), queries: Object.entries(QUERIES).map(([k, v]) => ({ key: k, title: v.title, why: v.why, cypher: v.cypher })) });
}
