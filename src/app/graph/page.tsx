"use client";
import { useEffect, useMemo, useState } from "react";
import { useData } from "@/components/useData";

const COLORS: Record<string, string> = { Company: "#2f6bff", Competitor: "#d9534f", Product: "#1f7a4d", Signal: "#e0a526", Person: "#8a63d2", Channel: "#6b7280", Agent: "#0e9aa7" };

export default function GraphPage() {
  const { d, reload, act } = useData();
  const [g, setG] = useState<any>(null);
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [edge, setEdge] = useState({ from: "", to: "" });
  const ws = d?.activeWs;
  const load = async () => { if (ws) setG(await (await fetch(`/api/graph?ws=${ws}`, { cache: "no-store" })).json()); };
  useEffect(() => { load(); }, [ws, d?.leads.length, d?.audit.length]); // eslint-disable-line
  const layout = useMemo(() => {
    if (!g) return null;
    const groups: Record<string, any[]> = {};
    g.nodes.forEach((n: any) => (groups[n.label] ||= []).push(n));
    const order = ["Competitor", "Product", "Company", "Signal", "Person", "Channel", "Agent"];
    const pos: Record<string, { x: number; y: number }> = {};
    const W = 900, H = 520;
    const cols = order.filter((o) => groups[o]);
    cols.forEach((lab, ci) => {
      const arr = groups[lab].slice(0, 40);
      arr.forEach((n, i) => { pos[n.id] = { x: 50 + (ci * (W - 100)) / Math.max(1, cols.length - 1), y: 30 + ((i + 0.5) * (H - 60)) / arr.length }; });
    });
    return { pos, W, H };
  }, [g]);
  async function runQ(key: string) {
    setBusy(true); const r = await fetch(`/api/graph?ws=${ws}&q=${key}`, { cache: "no-store" }); setRes({ key, status: r.status, ...(await r.json()) }); await reload(); setBusy(false);
  }
  if (!d) return <p className="mute">Loading…</p>;
  if (!g) return <p className="mute">Loading graph…</p>;
  if (d.leads.length === 0) return <p className="mute">Run the pipeline from Intake first.</p>;
  return (
    <div className="space-y-5">
      <header><h1 className="text-2xl font-semibold">Knowledge graph</h1><p className="mute">Kùzu property graph rebuilt from state: {g.nodes.length} nodes, {g.edges.length} relationships. Each query below is a real Cypher statement and is metered.</p></header>
      <div className="card p-2 overflow-x-auto">
        <svg viewBox={`0 0 ${layout!.W} ${layout!.H}`} className="w-full" style={{ minWidth: 700 }}>
          {g.edges.map((e: any, i: number) => { const a = layout!.pos[e.from], b = layout!.pos[e.to]; return a && b ? <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--line)" strokeWidth={e.type === "PREVIOUSLY_EMPLOYED_AT" ? 2.5 : 1} /> : null; })}
          {g.nodes.map((n: any) => { const p = layout!.pos[n.id]; if (!p) return null; return (<g key={n.id}><circle cx={p.x} cy={p.y} r={n.label === "Company" ? 6 : 4.5} fill={COLORS[n.label]} /><title>{`${n.label}: ${n.name}`}</title>{["Company", "Competitor", "Product"].includes(n.label) && <text x={p.x + 9} y={p.y + 3} fontSize="9" fill="var(--fg)">{String(n.name).slice(0, 26)}</text>}</g>); })}
          {["Competitor", "Product", "Company", "Signal", "Person", "Channel", "Agent"].filter((l) => g.nodes.some((n: any) => n.label === l)).map((l, i, arr) => <text key={l} x={50 + (i * (layout!.W - 100)) / Math.max(1, arr.length - 1)} y={layout!.H - 6} textAnchor="middle" fontSize="11" fill={COLORS[l]}>{l}</text>)}
        </svg>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <section className="card p-4">
          <h2 className="font-semibold mb-2">Graph reasoning</h2>
          <div className="flex flex-wrap gap-2">{g.queries.map((q: any) => <button key={q.key} className="btn" disabled={busy} onClick={() => runQ(q.key)}>{q.title}</button>)}</div>
          {res && (<div className="mt-3 text-sm">
            <div className="font-semibold">{res.title ?? "Blocked"}</div><div className="mute text-xs mb-2">{res.why ?? res.note}</div>
            {res.cypher && <pre className="text-xs p-2 rounded overflow-x-auto" style={{ background: "var(--bg)" }}>{res.cypher}</pre>}
            {res.rows?.length === 0 && <div className="mute text-xs mt-2">No path found. That is honest: add a known contact on the right to create one.</div>}
            <div className="overflow-x-auto mt-2"><table><tbody>{(res.rows ?? []).map((r: any, i: number) => <tr key={i}>{Object.values(r).map((v: any, j) => <td key={j} className="text-xs">{String(v).slice(0, 90)}</td>)}</tr>)}</tbody></table></div></div>)}
        </section>
        <section className="card p-4">
          <h2 className="font-semibold mb-1">Add a known contact</h2>
          <p className="mute text-xs mb-3">Humans add network edges. A contact who previously worked at a matched account creates a warm path.</p>
          <input id="from" className="btn w-full mb-2" placeholder="Contact name" value={edge.from} onChange={(e) => setEdge({ ...edge, from: e.target.value })} />
          <select id="to" className="btn w-full mb-2" value={edge.to} onChange={(e) => setEdge({ ...edge, to: e.target.value })}>
            <option value="">Previously worked at…</option>{d.workspace.accounts.filter((a: any) => d.leads.some((l: any) => l.accountId === a.id)).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <button className="btn btn-primary" disabled={!edge.from || !edge.to} onClick={async () => { await act({ type: "addEdge", from: edge.from, to: edge.to, note: "added in demo" }); setEdge({ from: "", to: "" }); load(); }}>Add edge</button>
          <p className="mute text-xs mt-3">Edges added here are team input, not scraped data.</p>
        </section>
      </div>
    </div>
  );
}
