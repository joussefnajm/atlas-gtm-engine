"use client";
import { useState } from "react";
import { useData } from "@/components/useData";

export default function Outreach() {
  const { d, act } = useData();
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  if (!d) return <p className="mute">Loading…</p>;
  if (d.drafts.length === 0) return <p className="mute">Run the pipeline from Intake first.</p>;
  const w = d.workspace;
  const status = (s: string) => ({ pending: "var(--warn)", approved: "var(--ok)", edited: "var(--ok)", rejected: "var(--bad)", sent: "var(--accent)" } as any)[s];
  const counts = ["pending", "approved", "edited", "rejected", "sent"].map((s) => [s, d.drafts.filter((x: any) => x.status === s).length]);
  return (
    <div className="space-y-5 max-w-5xl">
      <header><h1 className="text-2xl font-semibold">Human approval gate</h1>
        <p className="mute">Every message is reviewed by code (facts and security) and then waits here, or in the WhatsApp agent, for a person. Dispatch is a dry run until a sender is connected.</p></header>
      <div className="flex flex-wrap gap-2 items-center">
        {counts.map(([s, n]) => <span key={s as string} className="pill" style={{ color: status(s as string) }}>{s as string}: {n as number}</span>)}
        <span className="flex-1" />
        <button className="btn" onClick={async () => { const r = await act({ type: "exportQueue", ws: d.activeWs }); setNote(`Exported ${r.exported} drafts to the WhatsApp agent folder (${r.held} held by review). Folder: ${r.dir}`); }}>Send queue to WhatsApp agent</button>
        <button className="btn" onClick={async () => { const r = await act({ type: "importDecisions", ws: d.activeWs }); setNote(`${r.applied} decision(s) applied. ${r.note}`); }}>Import decisions</button>
        <button className="btn btn-primary" onClick={async () => { const r = await act({ type: "dispatchAll", ws: d.activeWs }); setNote(`${r.sent} approved message(s) logged as sent (dry run).`); }}>Dispatch approved</button>
      </div>
      {note && <div className="card p-3 text-sm">{note}</div>}
      <div className="space-y-3">
        {d.drafts.map((x: any) => {
          const a = w.accounts.find((y: any) => y.id === x.accountId);
          const flagged = x.review.facts === "flag" || x.review.security === "flag";
          return (
            <article key={x.id} className="card p-4" style={{ borderColor: flagged ? "var(--bad)" : undefined }}>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <b className="text-sm">{a.name}</b><span className="mute">{x.toRole.split(" at ")[0]}</span><span className="pill">{x.channel} · touch {x.touch} · {x.variant === "v1" ? "signal-led" : "benefit-led"}</span>
                <span className="pill" style={{ color: x.review.facts === "ok" ? "var(--ok)" : "var(--bad)" }}>facts {x.review.facts}</span>
                <span className="pill" style={{ color: x.review.security === "ok" ? "var(--ok)" : "var(--bad)" }}>security {x.review.security}</span>
                <span className="pill ml-auto" style={{ color: status(x.status) }}>{x.status}{x.queue ? ` · #${x.queue.ref} in WhatsApp queue` : ""}</span>
              </div>
              {x.subject && <div className="mt-2 text-sm"><span className="mute">Subject:</span> {x.subject}</div>}
              {editing === x.id
                ? <textarea id={"e" + x.id} className="w-full card p-2 mt-2 text-sm" rows={5} value={text} onChange={(e) => setText(e.target.value)} />
                : <p className="mt-2 text-sm whitespace-pre-wrap">{x.editedBody ?? x.body}</p>}
              <details className="mt-2 text-xs mute"><summary className="cursor-pointer">English gloss and source</summary><p className="mt-1">{x.english}</p><a className="underline" style={{ color: "var(--accent)" }} href={x.sources[0]} target="_blank" rel="noreferrer">{x.sources[0]}</a></details>
              {x.review.notes.length > 0 && <ul className="mt-2 text-xs" style={{ color: "var(--bad)" }}>{x.review.notes.map((n: string, i: number) => <li key={i}>• {n}</li>)}</ul>}
              <div className="flex gap-2 mt-3">
                {editing === x.id ? (<><button className="btn btn-primary" onClick={async () => { await act({ type: "edit", id: x.id, text }); setEditing(null); }}>Save edit</button><button className="btn" onClick={() => setEditing(null)}>Cancel</button></>) : (<>
                  <button className="btn" disabled={x.status === "sent"} onClick={() => act({ type: "approve", id: x.id })}>Approve</button>
                  <button className="btn" disabled={x.status === "sent"} onClick={() => { setEditing(x.id); setText(x.editedBody ?? x.body); }}>Edit</button>
                  <button className="btn" disabled={x.status === "sent"} onClick={() => act({ type: "reject", id: x.id })}>Reject</button>
                  {["approved", "edited"].includes(x.status) && <button className="btn btn-primary" onClick={() => act({ type: "dispatch", id: x.id })}>Dispatch (dry run)</button>}</>)}
              </div>
            </article>);
        })}
      </div>
    </div>
  );
}
