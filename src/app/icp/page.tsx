"use client";
import { useData } from "@/components/useData";

const Bar = ({ v }: { v: number }) => (
  <div className="flex items-center gap-2"><div className="h-2 w-24 rounded" style={{ background: "var(--line)" }}><div className="h-2 rounded" style={{ width: `${v * 100}%`, background: v >= 0.8 ? "var(--ok)" : v >= 0.65 ? "var(--warn)" : "var(--bad)" }} /></div><span className="text-xs tabular-nums">{v.toFixed(2)}</span></div>
);

export default function Icp() {
  const { d, act } = useData();
  if (!d) return <p className="mute">Loading…</p>;
  const icp = d.icp;
  return (
    <div className="max-w-5xl space-y-6">
      <header><h1 className="text-2xl font-semibold">Inferred ICP</h1><p className="mute">Each field carries a confidence score and the reason. Inferred from: {icp.inferredFrom.join("; ")}.</p></header>
      <div className="card overflow-x-auto"><table>
        <thead><tr><th>Field</th><th>Value</th><th>Confidence</th><th>Why</th></tr></thead>
        <tbody>{icp.fields.map((f: any) => (
          <tr key={f.key}><td className="font-semibold">{f.label}</td>
            <td>{Array.isArray(f.value) ? f.value.join(" · ") : f.value}{f.naics && <div className="mute text-xs mt-1">NAICS {f.naics.join(", ")}</div>}</td>
            <td><Bar v={f.confidence} /></td><td className="mute text-xs max-w-xs">{f.why}</td></tr>))}</tbody></table></div>
      <section>
        <h2 className="font-semibold mb-2">Adjacent segments</h2>
        <p className="mute text-sm mb-3">Suggestions backed by evidence. Accepting or dismissing is a human decision and is written to the audit log.</p>
        <div className="grid md:grid-cols-3 gap-3">
          {icp.expansion.map((x: any) => {
            const st = d.accepted[x.id] ?? x.status;
            return (
              <div key={x.id} className="card p-4 flex flex-col gap-2">
                <div className="font-semibold">{x.segment}</div><div className="mute text-xs">{x.evidence}</div><Bar v={x.confidence} />
                <div className="flex gap-2 mt-1">
                  <button className="btn" onClick={() => act({ type: "icp", id: x.id, status: "accepted" })}>Accept</button>
                  <button className="btn" onClick={() => act({ type: "icp", id: x.id, status: "dismissed" })}>Dismiss</button>
                  <span className="pill ml-auto" style={{ color: st === "accepted" ? "var(--ok)" : st === "dismissed" ? "var(--bad)" : "var(--mute)" }}>{st}</span>
                </div>
              </div>);
          })}
        </div>
      </section>
    </div>
  );
}
