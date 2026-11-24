import type { Account, Tier } from "./types";

/** Fit (0-70) = industry 0-40 + region 0-20 + persona coverage 0-10. Intent (0-30) = best signal strength and signal count. */
export function score(a: Account) {
  const fit = Math.round(a.industryFit * 40) + (a.inRegion ? 20 : 0) + Math.min(10, a.roles.length * 4);
  const best = a.signals.reduce((m, s) => Math.max(m, s.strength), 0);
  const intent = Math.round(best * 25 + Math.min(5, (a.signals.length - 1) * 5));
  const total = Math.min(100, fit + intent);
  const tier: Tier = total >= 80 ? "A" : total >= 65 ? "B" : "C";
  return { fit, intent, total, tier };
}
