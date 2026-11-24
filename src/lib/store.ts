import fs from "node:fs";
import path from "node:path";
import seed from "../../data/seed.json";
import type { State, Workspace } from "./types";

const FILE = path.join(process.cwd(), "data", "state.json");
export const SEED = seed as unknown as { meta: any; workspaces: Workspace[]; agents: any[]; variants: any[] };
export const wsById = (id: string) => SEED.workspaces.find((w) => w.id === id) ?? SEED.workspaces[0];

export function initialState(): State {
  return {
    version: 1, activeWs: "fe-solar", mode: process.env.ANTHROPIC_API_KEY ? "live" : "cache", ran: {},
    accepted: {}, leads: [], drafts: [], log: [], audit: [],
    meter: { balance: 100, granted: 100, events: [] }, extraEdges: [],
  };
}
export function load(): State {
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return initialState(); }
}
export function save(s: State) {
  s.version += 1;
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(s, null, 1));
}
export const now = () => new Date().toISOString();
export function audit(s: State, actor: string, action: string, detail: string) {
  s.audit.unshift({ at: now(), actor, action, detail });
}
export function say(s: State, ws: string, agent: string, kind: any, text: string, tokens = 0) {
  s.log.push({ at: now(), ws, agent, kind, text, tokens });
}
