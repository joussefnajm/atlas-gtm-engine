"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { DataProvider, useData } from "./useData";

const NAV = [
  ["/", "Intake"], ["/icp", "ICP"], ["/leads", "Leads"], ["/graph", "Graph"], ["/outreach", "Approvals"], ["/pipeline", "Pipeline"], ["/agents", "Agents & usage"],
];

function Inner({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { d, act, busy } = useData();
  const [open, setOpen] = useState(true);
  const feed = (d?.log ?? []).slice(-14);
  return (
    <div className="min-h-screen flex">
      <aside className="w-52 shrink-0 border-r p-4 hidden md:block" style={{ borderColor: "var(--line)" }}>
        <div className="font-semibold text-lg">Atlas GTM</div>
        <div className="mute text-xs mb-5">Evidence-first go-to-market</div>
        <nav className="flex flex-col gap-1">
          {NAV.map(([h, l]) => (
            <Link key={h} href={h} className="px-3 py-2 rounded-md" style={{ background: path === h ? "var(--card)" : "transparent", border: "1px solid " + (path === h ? "var(--line)" : "transparent"), fontWeight: path === h ? 600 : 400 }}>{l}</Link>
          ))}
        </nav>
        {d && (
          <div className="mt-6 text-xs mute">
            <div className="mb-1 uppercase tracking-wide">Workspace</div>
            <select className="w-full btn" value={d.activeWs} onChange={(e) => act({ type: "setWs", ws: e.target.value })}>
              {d.workspaces.map((w: any) => <option key={w.id} value={w.id}>{w.label}</option>)}
            </select>
            <div className="mt-4 uppercase tracking-wide">Credits</div>
            <div className="text-xl font-semibold" style={{ color: "var(--fg)" }}>{d.meter.balance}<span className="mute text-xs"> / {d.meter.granted}</span></div>
            <div className="mt-1">Mode: <b>{d.mode}</b></div>
          </div>
        )}
      </aside>
      <main className="flex-1 min-w-0 p-5 md:p-8">
        <div className="md:hidden flex gap-2 overflow-x-auto mb-4">{NAV.map(([h, l]) => <Link key={h} href={h} className="btn whitespace-nowrap">{l}</Link>)}</div>
        {busy && <div className="card p-3 mb-4">Agents are working…</div>}
        {children}
        <div className="card mt-8">
          <button className="w-full text-left px-4 py-3 font-semibold flex justify-between" onClick={() => setOpen(!open)}>
            <span>Agent thinking</span><span className="mute text-xs">{open ? "hide" : "show"} · {feed.length} recent steps</span>
          </button>
          {open && (
            <ul className="px-4 pb-3 text-xs space-y-1.5 max-h-56 overflow-auto">
              {feed.length === 0 && <li className="mute">Run the pipeline to see each agent step.</li>}
              {feed.map((m: any, i: number) => (
                <li key={i}><b>{m.agent}</b> <span className="pill mute">{m.kind}</span> {m.text}</li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
export default function Shell({ children }: { children: React.ReactNode }) {
  return <DataProvider><Inner>{children}</Inner></DataProvider>;
}
