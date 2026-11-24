export type Stage = "matched" | "contacted" | "replied" | "meeting" | "closed" | "lost";
export type Tier = "A" | "B" | "C";
export type DraftStatus = "pending" | "approved" | "edited" | "rejected" | "sent";
export type Channel = "email" | "linkedin" | "whatsapp" | "instagram";

export interface Signal { id: string; type: string; text: string; textEs?: string; date: string; url: string; strength: number }
export interface Account {
  id: string; name: string; city: string; region: string; industry: string; size: string; inRegion: boolean; industryFit: number;
  domain: string | null; currentVendor: string | null; signals: Signal[]; angle: string; angleEs?: string; roles: string[]; verification?: string; instagram?: string;
}
export interface Workspace {
  id: string; label: string; homeRegion: string; product: { id: string; name: string; intake: string; lines: string[] };
  icp: any; competitors: any[]; accounts: Account[]; marketSignals: { id: string; text: string; url: string }[];
}
export interface Lead {
  ws: string; accountId: string; stage: Stage; owner: "ai" | "rep"; score: number; tier: Tier; fit: number; intent: number;
  enrichment: { status: "pending" | "verified" | "skipped"; note: string };
  variant: "v1" | "v2"; updatedAt: string; sandbox?: boolean;
}
export interface Draft {
  id: string; ws: string; accountId: string; touch: number; channel: Channel; variant: "v1" | "v2";
  toRole: string; subject?: string; body: string; english: string; sources: string[];
  status: DraftStatus; review: { facts: "ok" | "flag"; security: "ok" | "flag"; notes: string[] };
  editedBody?: string; decidedBy?: string; decidedAt?: string; queue?: { exportedAt: string; ref: number };
}
export interface AuditEntry { at: string; actor: string; action: string; detail: string }
export interface AgentMsg { at: string; ws: string; agent: string; kind: "plan" | "action" | "check" | "hitl" | "meter" | "alert"; text: string; tokens?: number }
export interface Meter { balance: number; granted: number; events: { at: string; ws: string; name: string; qty: number; cost: number; blocked?: boolean; flexprice?: string }[] }
export interface State {
  version: number; activeWs: string; mode: "cache" | "live"; ran: Record<string, string>;
  accepted: Record<string, "accepted" | "dismissed">; icp?: Record<string, any>; leads: Lead[]; drafts: Draft[];
  log: AgentMsg[]; audit: AuditEntry[]; meter: Meter; extraEdges: { ws: string; from: string; to: string; type: string; note: string }[];
}
