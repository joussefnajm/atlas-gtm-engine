"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Data = any;
const Ctx = createContext<{ d: Data | null; reload: () => Promise<void>; act: (b: any) => Promise<any>; run: (reset?: boolean) => Promise<void>; busy: boolean }>({ d: null, reload: async () => {}, act: async () => ({}), run: async () => {}, busy: false });

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [d, setD] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const reload = useCallback(async () => {
    const ws = typeof window !== "undefined" ? localStorage.getItem("ws") : null;
    const r = await fetch("/api/state" + (ws ? `?ws=${ws}` : ""), { cache: "no-store" });
    setD(await r.json());
  }, []);
  useEffect(() => { reload(); }, [reload]);
  const act = useCallback(async (b: any) => {
    if (b.type === "setWs") localStorage.setItem("ws", b.ws);
    const r = await fetch("/api/action", { method: "POST", body: JSON.stringify({ ws: d?.activeWs, ...b }) });
    const j = await r.json(); await reload(); return j;
  }, [d, reload]);
  const run = useCallback(async (reset = false) => {
    setBusy(true);
    await fetch("/api/run", { method: "POST", body: JSON.stringify({ ws: d?.activeWs, reset }) });
    await reload(); setBusy(false);
  }, [d, reload]);
  return <Ctx.Provider value={{ d, reload, act, run, busy }}>{children}</Ctx.Provider>;
}
export const useData = () => useContext(Ctx);
