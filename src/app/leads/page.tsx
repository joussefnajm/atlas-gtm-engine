"use client";
import { useState } from "react";
import { useData } from "@/components/useData";

const tierColor: Record<string, string> = { A: "var(--ok)", B: "var(--warn)", C: "var(--mute)" };

export default function Leads() {
  const { d } = useData();
  const [open, setOpen] = useState<string | null>(null);
  const [tier, setTier] = useState("all");
  if (!d) return <p className="mute">Loading…</p>;
  if (d.leads.length === 0) return <p className="mute">Run the pipeline from Intake first.</p>;
  const rows = [...d.leads].sort((a: any, b: any) => b.score - a.score).filter((l: any) => tier === "all" || l.tier === tier);
  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-semibold">Leads</h1><p className="mute">Every row has a public source. Fit (0–70) plus intent (0–30) gives a 0–100 score and a tier.</p></div>
        <div className="flex gap-1">{["all", "A", "B", "C"].map((t) => <button key={t} className="btn" style={{ borderColor: tier === t ? "var(--accent)" : undefined }} onClick={() => setTier(t)}>{t === "all" ? "All" : `Tier ${t}`}</button>)}</div>
      </header>
      <div className="card overflow-x-auto"><table>
        <thead><tr><th>Account</th><th>Tier</th><th>Score</th><th>Signal and source</th><th>Contact</th><th>Stage</th></tr></thead>
        <tbody>{rows.map((l: any) => {
          const a = d.workspace.accounts.find((x: any) => x.id === l.accountId);
          const sg = a.signals[0];
          return (<>
            <tr key={l.accountId} className="cursor-pointer" onClick={() => setOpen(open === l.accountId ? null : l.accountId)}>
              <td><div className="font-semibold">{a.name}</div><div className="mute text-xs">{a.industry} · {a.city || a.region}</div></td>
              <td><span className="pill" style={{ color: tierColor[l.tier], borderColor: tierColor[l.tier] }}>{l.tier}</span></td>
              <td className="tabular-nums"><b>{l.score}</b><div className="mute text-xs">fit {l.fit} · intent {l.intent}</div></td>
              <td className="max-w-md"><div className="text-xs">{sg.text}</div><a className="text-xs underline" style={{ color: "var(--accent)" }} href={sg.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>source</a>{a.verification && <span className="pill ml-2 mute">verified {a.verification}</span>}</td>
              <td className="text-xs"><span className="pill" title={l.enrichment.note}>{l.enrichment.status}</span><div className="mute mt-1">{a.roles[0]}</div></td>
              <td><span className="pill">{l.stage}</span></td></tr>
            {open === l.accountId && <tr key={l.accountId + "x"}><td colSpan={6} className="text-sm" style={{ background: "var(--bg)" }}>
              <div className="grid md:grid-cols-2 gap-4">
                <div><div className="mute text-xs uppercase">Angle</div>{a.angle}<div className="mute text-xs uppercase mt-3">Enrichment</div>{l.enrichment.note}</div>
                <div><div className="mute text-xs uppercase">All signals</div>{a.signals.map((s: any) => <div key={s.id} className="text-xs mb-1">{s.type} ({s.strength}): {s.text} <a className="underline" style={{ color: "var(--accent)" }} href={s.url} target="_blank" rel="noreferrer">source</a></div>)}</div>
              </div></td></tr>}
          </>);
        })}</tbody></table></div>
    </div>
  );
}
