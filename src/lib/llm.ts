import Anthropic from "@anthropic-ai/sdk";
import type { Workspace } from "./types";

export const MODEL = process.env.LLM_MODEL || "claude-sonnet-5-5";

/** Infers a structured ICP. Live when ANTHROPIC_API_KEY is set; otherwise returns the cached inference for this workspace. */
export async function inferIcp(ws: Workspace): Promise<{ icp: any; mode: "live" | "cache"; tokens: number; error?: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { icp: ws.icp, mode: "cache", tokens: 0 };
  try {
    const client = new Anthropic({ apiKey: key });
    const res = await client.messages.create({
      model: MODEL, max_tokens: 1800,
      messages: [{
        role: "user",
        content: `You are a B2B go-to-market analyst. From this product description infer an ideal customer profile. Return only JSON with keys fields (array of {key,label,value,confidence 0-1,why}), expansion (array of {id,segment,evidence,confidence,status:"suggested"}). Keys for fields: industries, size, personas, triggers, geo, negatives. Do not invent facts that are not in the text; say so in "why" when you infer.\n\nProduct:\n${ws.product.intake}`,
      }],
    });
    const text = res.content.map((b: any) => (b.type === "text" ? b.text : "")).join("");
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    return { icp: { ...ws.icp, fields: json.fields ?? ws.icp.fields, expansion: json.expansion ?? ws.icp.expansion, inferredFrom: ["live inference from the intake text"] }, mode: "live", tokens: (res.usage?.input_tokens ?? 0) + (res.usage?.output_tokens ?? 0) };
  } catch (e: any) {
    return { icp: ws.icp, mode: "cache", tokens: 0, error: String(e?.message ?? e).slice(0, 200) };
  }
}

/** Optional live discovery through Tavily. Returns candidate accounts with the source URL as the signal. */
export async function discoverLive(ws: Workspace, query: string) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ query, max_results: 8, search_depth: "basic" }),
    });
    const j: any = await res.json();
    return (j.results ?? []).map((r: any, i: number) => ({
      id: `live${i}`, name: String(r.title).slice(0, 80), city: "", region: ws.homeRegion, inRegion: true, industry: "to classify", industryFit: 0.6,
      size: "unknown", domain: null, currentVendor: null, verification: "C",
      signals: [{ id: `sl${i}`, type: "web_mention", text: String(r.content).slice(0, 200), date: new Date().toISOString().slice(0, 10), url: r.url, strength: Math.min(0.7, r.score ?? 0.5) }],
      angle: "Found by live search; needs review.", roles: ["Owner"],
    }));
  } catch { return []; }
}

/** Optional contact enrichment through Hunter. Stores only the count of verified addresses, never the addresses. */
export async function enrichDomain(domain: string) {
  const key = process.env.HUNTER_API_KEY;
  if (!key || !domain) return { status: "skipped" as const, note: key ? "no domain to look up" : "no enrichment key configured" };
  try {
    const res = await fetch(`https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=3&api_key=${key}`);
    const j: any = await res.json();
    const n = (j.data?.emails ?? []).filter((e: any) => (e.verification?.status ?? "") === "valid" || e.confidence >= 80).length;
    return { status: n > 0 ? ("verified" as const) : ("pending" as const), note: `${n} deliverable address(es) found` };
  } catch (e: any) { return { status: "skipped" as const, note: `lookup failed: ${String(e?.message ?? e).slice(0, 80)}` }; }
}
