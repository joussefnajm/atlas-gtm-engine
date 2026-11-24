"use client";
import Link from "next/link";
import { useData } from "@/components/useData";

export default function Intake() {
  const { d, run, busy } = useData();
  if (!d) return <p className="mute">Loading…</p>;
  const w = d.workspace;
  const ran = !!d.ranAt;
  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Describe what you sell. The engine does the rest.</h1>
        <p className="mute mt-1 max-w-2xl">Atlas turns a plain-language product description into an ICP, finds accounts with a cited public source, builds a knowledge graph, drafts personalized outreach and holds every message for a human. Usage is metered per event.</p>
      </header>
      <section className="card p-5">
        <div className="flex justify-between items-start gap-4">
          <div><div className="mute text-xs uppercase tracking-wide">Product</div><div className="font-semibold text-lg">{w.product.name}</div></div>
          <div className="flex gap-2">
            <button className="btn btn-primary" disabled={busy} onClick={() => run(false)}>{ran ? "Run again" : "Run pipeline"}</button>
            {ran && <button className="btn" disabled={busy} onClick={() => run(true)}>Reset and run</button>}
          </div>
        </div>
        <label className="block mt-4 text-xs mute uppercase tracking-wide" htmlFor="intake">Product intake (plain language)</label>
        <textarea id="intake" readOnly className="w-full mt-1 p-3 card text-sm" rows={6} value={w.product.intake} />
        <div className="mt-3 flex flex-wrap gap-2">{w.product.lines.map((l: string) => <span key={l} className="pill">{l}</span>)}</div>
        <p className="mute text-xs mt-3">Mode <b>{d.mode}</b>: {d.mode === "cache" ? "the ICP comes from a stored inference and discovery from public evidence collected on 2026-11-24. Set ANTHROPIC_API_KEY and TAVILY_API_KEY to run live." : "live model calls."}</p>
      </section>
      {ran && (
        <section className="grid md:grid-cols-4 gap-3">
          {[["Accounts matched", d.leads.length], ["Tier A", d.leads.filter((l: any) => l.tier === "A").length], ["Messages waiting for a human", d.drafts.filter((x: any) => x.status === "pending").length], ["Credits left", d.meter.balance]].map(([l, v]) => (
            <div key={l as string} className="card p-4"><div className="text-2xl font-semibold">{v}</div><div className="mute text-xs">{l}</div></div>
          ))}
        </section>
      )}
      <section className="card p-5">
        <h2 className="font-semibold mb-2">Closed loop</h2>
        <ol className="grid md:grid-cols-5 gap-3 text-sm">
          {[["Intake", "/", "Plain-language product and pricing"], ["ICP", "/icp", "Fields with confidence and expansion segments"], ["Leads", "/leads", "Cited accounts, tiers and fit/intent"], ["Graph", "/graph", "Multi-hop queries over signals and competitors"], ["Approvals", "/outreach", "Nothing leaves without a human yes"]].map(([t, h, s]) => (
            <li key={t} className="card p-3"><Link href={h} className="font-semibold">{t}</Link><div className="mute text-xs mt-1">{s}</div></li>
          ))}
        </ol>
      </section>
      <p className="mute text-xs">{d.meta.note}</p>
    </div>
  );
}
