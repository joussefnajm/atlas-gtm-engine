"use client";
import { useState } from "react";
import { useData } from "@/components/useData";

export default function Agents() {
  const { d, act } = useData();
  const [st, setSt] = useState<any>(null);
  if (!d) return <p className="mute">Loading…</p>;
  const m = d.meter;
  const I = d.integrations;
  const rows: [string, boolean, string][] = [
    ["Reasoning layer (LLM + RAG over evidence)", I.llm, "ANTHROPIC_API_KEY"], ["Live search (Tavily)", I.tavily, "TAVILY_API_KEY"], ["Contact enrichment (Hunter)", I.hunter, "HUNTER_API_KEY"],
    ["Usage metering and credits (Flexprice)", I.flexprice, "FLEXPRICE_API_KEY"], ["Data fabric (Nexla Nexset)", false, "planned"], ["Human-agent channel (Teamily)", false, "planned"],
  ];
  return (
    <div className="space-y-6 max-w-5xl">
      <header><h1 className="text-2xl font-semibold">Agents and usage</h1><p className="mute">Roles map to agents already running the ecosystem. Metered events use the same names that are sent to Flexprice.</p></header>
      <section className="grid md:grid-cols-3 gap-3">
        {d.agents.map((a: any) => <div key={a.id} className="card p-4"><div className="font-semibold">{a.name}</div><div className="mute text-xs">Ecosystem agent: {a.ecosystemAgent}</div><div className="text-sm mt-1">{a.duty}</div></div>)}
      </section>
      <section className="grid md:grid-cols-2 gap-4">
        <div className="card p-4"><h2 className="font-semibold mb-2">Credits</h2>
          <div className="text-3xl font-semibold">{m.balance}<span className="mute text-sm"> of {m.granted}</span></div>
          <div className="h-2 rounded mt-2" style={{ background: "var(--line)" }}><div className="h-2 rounded" style={{ width: `${(m.balance / m.granted) * 100}%`, background: "var(--accent)" }} /></div>
          <table className="mt-3"><thead><tr><th>Event</th><th>Qty</th><th>Credits</th></tr></thead><tbody>{Object.entries(m.by).map(([k, v]: any) => <tr key={k}><td>{k}</td><td className="tabular-nums">{v.qty}</td><td className="tabular-nums">{Math.round(v.cost * 10) / 10}</td></tr>)}</tbody></table>
          <button className="btn mt-3" onClick={() => act({ type: "grant" })}>Grant +100 credits (demo)</button>
          <p className="mute text-xs mt-2">{m.blocked} event(s) gated for lack of credits. When the balance runs out, enrichment, drafting and graph queries stop.</p></div>
        <div className="card p-4"><h2 className="font-semibold mb-2">Integrations</h2>
          <ul className="space-y-2 text-sm">{rows.map(([n, on, key]) => <li key={n} className="flex justify-between gap-2"><span>{n}</span><span className="pill" style={{ color: on ? "var(--ok)" : "var(--mute)" }}>{on ? "live" : key === "planned" ? "planned (adapter interface only)" : `cache · set ${key}`}</span></li>)}
            <li className="flex justify-between gap-2"><span>WhatsApp agent approval queue</span><span className="pill" style={{ color: "var(--ok)" }}>file contract</span></li></ul>
          <p className="mute text-xs mt-3">Folder shared with the WhatsApp agent: <code>{I.yowasapDir}</code></p></div>
      </section>
      <section className="card p-4"><h2 className="font-semibold mb-1">Reviewer and security self-test</h2>
        <p className="mute text-xs mb-3">Runs the real checks on eight deliberately bad drafts: invented numbers, unsupported promises, unlisted links, contact data, missing opt-out line, AI tool names and uncited sources.</p>
        <button className="btn" onClick={async () => setSt(await (await fetch("/api/selftest", { cache: "no-store" })).json())}>Run self-test</button>
        {st && <div className="mt-3 text-sm"><b>{st.passed} / {st.total} cases caught as expected</b><ul className="text-xs mt-2 space-y-1">{st.cases.map((c: any) => <li key={c.name}>{c.ok ? "✓" : "✗"} {c.name} → {c.got}{c.notes[0] ? ` (${c.notes[0]})` : ""}</li>)}</ul></div>}</section>
      <section className="card p-4"><h2 className="font-semibold mb-2">Metering events</h2>
        <div className="overflow-x-auto"><table><thead><tr><th>Time</th><th>Event</th><th>Qty</th><th>Cost</th><th>Flexprice</th></tr></thead>
          <tbody>{m.events.map((e: any, i: number) => <tr key={i}><td className="text-xs">{e.at.slice(11, 19)}</td><td>{e.name}{e.blocked ? " (gated)" : ""}</td><td className="tabular-nums">{e.qty}</td><td className="tabular-nums">{e.cost}</td><td className="text-xs mute">{e.flexprice}</td></tr>)}</tbody></table></div></section>
    </div>
  );
}
