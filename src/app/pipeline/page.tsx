"use client";
import { useData } from "@/components/useData";

const STAGES: [string, string][] = [["matched", "Matched"], ["contacted", "Contacted"], ["replied", "Replied"], ["meeting", "Meeting booked"], ["closed", "Closed"], ["lost", "Lost"]];

export default function Pipeline() {
  const { d, act } = useData();
  if (!d) return <p className="mute">Loading…</p>;
  if (d.leads.length === 0) return <p className="mute">Run the pipeline from Intake first.</p>;
  const acc = (id: string) => d.workspace.accounts.find((a: any) => a.id === id);
  const total = d.leads.length;
  const reached = (k: string) => d.leads.filter((l: any) => STAGES.findIndex((s) => s[0] === l.stage) >= STAGES.findIndex((s) => s[0] === k) && l.stage !== "lost").length;
  const by = (key: (l: any) => string) => {
    const m: Record<string, { n: number; contacted: number; replied: number }> = {};
    d.leads.forEach((l: any) => { const k = key(l); m[k] ||= { n: 0, contacted: 0, replied: 0 }; m[k].n++; if (reached("contacted") && STAGES.findIndex((s) => s[0] === l.stage) >= 1 && l.stage !== "lost") m[k].contacted++; if (["replied", "meeting", "closed"].includes(l.stage)) m[k].replied++; });
    return m;
  };
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) + "%" : "–");
  const tiers = by((l) => "Tier " + l.tier), inds = by((l) => acc(l.accountId).industry);
  const variants: Record<string, { sent: number; replied: number }> = { v1: { sent: 0, replied: 0 }, v2: { sent: 0, replied: 0 } };
  d.leads.forEach((l: any) => { if (l.stage !== "matched") { variants[l.variant].sent++; if (["replied", "meeting", "closed"].includes(l.stage)) variants[l.variant].replied++; } });
  const anySandbox = d.leads.some((l: any) => l.sandbox);
  return (
    <div className="space-y-6">
      <header><h1 className="text-2xl font-semibold">Pipeline</h1><p className="mute">Stage moves by the engine are marked <b>AI</b>; moves by a person are marked <b>Rep</b>. Replies you simulate are labeled sandbox and never counted as real results.</p></header>
      <div className="grid gap-3 overflow-x-auto" style={{ gridTemplateColumns: "repeat(6, minmax(190px, 1fr))" }}>
        {STAGES.map(([k, label]) => (
          <section key={k} className="card p-3 min-h-40">
            <div className="flex justify-between text-sm font-semibold mb-2"><span>{label}</span><span className="mute">{d.leads.filter((l: any) => l.stage === k).length}</span></div>
            <div className="space-y-2">
              {d.leads.filter((l: any) => l.stage === k).sort((a: any, b: any) => b.score - a.score).map((l: any) => (
                <div key={l.accountId} className="card p-2 text-xs">
                  <div className="font-semibold">{acc(l.accountId).name}</div>
                  <div className="mute">Tier {l.tier} · {l.score} · <b>{l.owner === "ai" ? "AI" : "Rep"}</b>{l.sandbox ? " · sandbox" : ""}</div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {k === "contacted" && <button className="pill" onClick={() => act({ type: "stage", ws: d.activeWs, accountId: l.accountId, stage: "replied", owner: "rep", sandbox: true })}>simulate reply</button>}
                    {k === "replied" && <button className="pill" onClick={() => act({ type: "stage", ws: d.activeWs, accountId: l.accountId, stage: "meeting", owner: "rep", sandbox: l.sandbox })}>book meeting</button>}
                    {k === "meeting" && <button className="pill" onClick={() => act({ type: "stage", ws: d.activeWs, accountId: l.accountId, stage: "closed", owner: "rep", sandbox: l.sandbox })}>close</button>}
                    {["contacted", "replied", "meeting"].includes(k) && <button className="pill" onClick={() => act({ type: "stage", ws: d.activeWs, accountId: l.accountId, stage: "lost", owner: "rep", sandbox: l.sandbox })}>lost</button>}
                  </div>
                </div>))}
            </div>
          </section>))}
      </div>
      <section className="grid md:grid-cols-3 gap-4">
        <div className="card p-4"><h2 className="font-semibold mb-2">Conversion by stage</h2>
          {STAGES.slice(0, 5).map(([k, l]) => <div key={k} className="flex justify-between text-sm"><span>{l}</span><span className="tabular-nums">{reached(k)} · {pct(reached(k), total)}</span></div>)}</div>
        <div className="card p-4"><h2 className="font-semibold mb-2">By tier</h2>
          {Object.entries(tiers).sort().map(([k, v]) => <div key={k} className="flex justify-between text-sm"><span>{k} ({v.n})</span><span className="tabular-nums">reached {pct(v.contacted, v.n)} · replied {pct(v.replied, v.n)}</span></div>)}
          <h2 className="font-semibold mt-4 mb-2">By industry</h2>
          {Object.entries(inds).map(([k, v]) => <div key={k} className="flex justify-between text-xs gap-2"><span className="truncate">{k} ({v.n})</span><span className="tabular-nums shrink-0">{pct(v.replied, v.n)} replied</span></div>)}</div>
        <div className="card p-4"><h2 className="font-semibold mb-2">Message variants</h2>
          {Object.entries(variants).map(([k, v]) => <div key={k} className="flex justify-between text-sm"><span>{k === "v1" ? "Signal-led" : "Benefit-led"}</span><span className="tabular-nums">{v.sent} sent · {pct(v.replied, v.sent)} replied</span></div>)}
          <p className="mute text-xs mt-3">{anySandbox ? "Contains simulated replies (sandbox)." : "No replies yet. Rates stay empty until real or simulated replies arrive."}</p></div>
      </section>
      <section className="card p-4"><h2 className="font-semibold mb-2">Audit log</h2>
        <ul className="text-xs space-y-1 max-h-60 overflow-auto">{d.audit.map((e: any, i: number) => <li key={i}><span className="mute">{e.at.slice(11, 19)}</span> <b>{e.actor}</b> {e.action}: {e.detail}</li>)}</ul></section>
    </div>
  );
}
