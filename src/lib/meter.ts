import { now } from "./store";
import type { State } from "./types";

/** Credit price per metered event. Same event names are sent to Flexprice when a key is configured. */
export const PRICES: Record<string, number> = {
  icp_inferred: 3, lead_discovered: 0.5, lead_enriched: 2, outreach_drafted: 1, outreach_reviewed: 0.5, outreach_sent: 1, graph_query: 0.2, approval_exported: 0.1,
};

async function sendToFlexprice(name: string, qty: number, ws: string, eventId: string): Promise<string> {
  const key = process.env.FLEXPRICE_API_KEY;
  if (!key) return "local-only";
  const base = process.env.FLEXPRICE_BASE_URL || "https://api.cloud.flexprice.io";
  try {
    const res = await fetch(`${base}/v1/events`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key },
      body: JSON.stringify({
        event_name: name, external_customer_id: process.env.FLEXPRICE_CUSTOMER_ID || "najm-ecosystem",
        event_id: eventId, timestamp: now(), properties: { quantity: qty, workspace: ws }, source: "gtm-engine",
      }),
    });
    return res.ok ? `flexprice ${res.status}` : `flexprice error ${res.status}`;
  } catch (e: any) {
    return `flexprice unreachable: ${e?.message ?? e}`;
  }
}

/** Spend credits for a billable event. Returns false and logs a blocked event when the balance is too low. */
export async function spend(s: State, ws: string, name: string, qty = 1): Promise<boolean> {
  const cost = (PRICES[name] ?? 1) * qty;
  if (s.meter.balance < cost) {
    s.meter.events.unshift({ at: now(), ws, name, qty, cost, blocked: true, flexprice: "not sent (blocked)" });
    return false;
  }
  s.meter.balance = Math.round((s.meter.balance - cost) * 100) / 100;
  const id = `${ws}-${name}-${s.meter.events.length}-${Date.now()}`;
  const flexprice = await sendToFlexprice(name, qty, ws, id);
  s.meter.events.unshift({ at: now(), ws, name, qty, cost, flexprice });
  return true;
}

export function summary(s: State) {
  const by: Record<string, { qty: number; cost: number }> = {};
  for (const e of s.meter.events) {
    if (e.blocked) continue;
    by[e.name] = by[e.name] || { qty: 0, cost: 0 };
    by[e.name].qty += e.qty; by[e.name].cost += e.cost;
  }
  return { balance: s.meter.balance, granted: s.meter.granted, by, blocked: s.meter.events.filter((e) => e.blocked).length, flexpriceLive: !!process.env.FLEXPRICE_API_KEY };
}
