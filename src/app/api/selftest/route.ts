import { NextResponse } from "next/server";
import { wsById } from "@/lib/store";
import { review } from "@/lib/outreach";
import type { Draft } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Proves the reviewer and security checks catch bad copy. Each case is a deliberately bad draft. */
export async function GET() {
  const ws = wsById("fe-solar");
  const a = ws.accounts[0];
  const base: Draft = { id: "t", ws: ws.id, accountId: a.id, touch: 1, channel: "email", variant: "v1", toRole: "x", body: "", english: "", sources: [a.signals[0].url], status: "pending", review: { facts: "ok", security: "ok", notes: [] } };
  const optOut = " Si prefiere no recibir mensajes, responda «no» y no volvemos a escribir.";
  const hosts = ["instagram.com"];
  const cases = [
    { name: "Clean draft", expect: "pass", body: "Hola. Force Energy ha entregado 41 proyectos y 528 kWp." + optOut },
    { name: "Invented savings number", expect: "facts flag", body: "Hola. Ahorrará 37 % en su factura." + optOut },
    { name: "Unsupported promise", expect: "facts flag", body: "Hola. Le garantizamos resultados." + optOut },
    { name: "Link to an unlisted host", expect: "security flag", body: "Hola. Mire https://evil.example/x" + optOut },
    { name: "Personal contact data in body", expect: "security flag", body: "Hola. Escríbame a persona@correo.com" + optOut },
    { name: "Missing opt-out line", expect: "security flag", body: "Hola. Force Energy ha entregado 41 proyectos." },
    { name: "Names an AI tool", expect: "security flag", body: "Hola. Lo hacemos con ChatGPT." + optOut },
    { name: "Source not in evidence", expect: "facts flag", body: "Hola." + optOut, sources: ["https://not-cited.example/page"] },
  ];
  const out = cases.map((c) => {
    const r = review({ ...base, body: c.body, sources: c.sources ?? base.sources }, a, ws, hosts);
    const got = r.facts === "flag" ? "facts flag" : r.security === "flag" ? "security flag" : "pass";
    return { name: c.name, expected: c.expect, got, ok: got === c.expect || (c.expect === "facts flag" && r.facts === "flag") || (c.expect === "security flag" && r.security === "flag"), notes: r.notes };
  });
  return NextResponse.json({ passed: out.filter((x) => x.ok).length, total: out.length, cases: out });
}
