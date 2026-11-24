import kuzu from "kuzu";
import { wsById, SEED } from "./store";
import type { State } from "./types";

/** Builds an in-memory Kùzu property graph for one workspace from the current state and runs Cypher against it. */
export async function buildGraph(s: State, wsId: string) {
  const ws = wsById(wsId);
  const db = new kuzu.Database(":memory:");
  const c = new kuzu.Connection(db);
  const q = async (cy: string) => { const r: any = await c.query(cy); return r; };
  const esc = (x: string) => String(x ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");

  await q("CREATE NODE TABLE Company(id STRING, name STRING, industry STRING, region STRING, tier STRING, score INT64, PRIMARY KEY(id))");
  await q("CREATE NODE TABLE Person(id STRING, name STRING, role STRING, verified BOOLEAN, PRIMARY KEY(id))");
  await q("CREATE NODE TABLE Product(id STRING, name STRING, PRIMARY KEY(id))");
  await q("CREATE NODE TABLE Competitor(id STRING, name STRING, kind STRING, PRIMARY KEY(id))");
  await q("CREATE NODE TABLE Signal(id STRING, type STRING, text STRING, url STRING, strength DOUBLE, PRIMARY KEY(id))");
  await q("CREATE NODE TABLE Channel(id STRING, name STRING, PRIMARY KEY(id))");
  await q("CREATE NODE TABLE Agent(id STRING, name STRING, duty STRING, PRIMARY KEY(id))");
  await q("CREATE REL TABLE WORKS_AT(FROM Person TO Company)");
  await q("CREATE REL TABLE PREVIOUSLY_EMPLOYED_AT(FROM Person TO Company, note STRING)");
  await q("CREATE REL TABLE COMPETES_WITH(FROM Competitor TO Product)");
  await q("CREATE REL TABLE MATCHED_TO(FROM Company TO Product, score INT64)");
  await q("CREATE REL TABLE HAS_SIGNAL(FROM Company TO Signal)");
  await q("CREATE REL TABLE USES_VENDOR(FROM Company TO Competitor)");
  await q("CREATE REL TABLE CONTACTED_VIA(FROM Person TO Channel, at STRING)");
  await q("CREATE REL TABLE REPLIED_TO(FROM Person TO Channel, at STRING)");
  await q("CREATE REL TABLE OWNS(FROM Agent TO Product)");

  await q(`CREATE (:Product{id:'${esc(ws.product.id)}', name:'${esc(ws.product.name)}'})`);
  for (const k of ws.competitors) {
    await q(`CREATE (:Competitor{id:'${esc(k.id)}', name:'${esc(k.name)}', kind:'${esc(k.type)}'})`);
    await q(`MATCH (k:Competitor{id:'${esc(k.id)}'}), (p:Product{id:'${esc(ws.product.id)}'}) CREATE (k)-[:COMPETES_WITH]->(p)`);
  }
  for (const ag of SEED.agents) {
    await q(`CREATE (:Agent{id:'${esc(ag.id)}', name:'${esc(ag.ecosystemAgent)}', duty:'${esc(ag.duty)}'})`);
    await q(`MATCH (g:Agent{id:'${esc(ag.id)}'}), (p:Product{id:'${esc(ws.product.id)}'}) CREATE (g)-[:OWNS]->(p)`);
  }
  for (const ch of ["email", "linkedin", "whatsapp", "instagram"]) await q(`CREATE (:Channel{id:'${ch}', name:'${ch}'})`);

  for (const lead of s.leads.filter((l) => l.ws === wsId)) {
    const a = ws.accounts.find((x) => x.id === lead.accountId)!;
    await q(`CREATE (:Company{id:'${esc(a.id)}', name:'${esc(a.name)}', industry:'${esc(a.industry)}', region:'${esc(a.region)}', tier:'${lead.tier}', score:${lead.score}})`);
    await q(`MATCH (c:Company{id:'${esc(a.id)}'}), (p:Product{id:'${esc(ws.product.id)}'}) CREATE (c)-[:MATCHED_TO{score:${lead.score}}]->(p)`);
    for (const sg of a.signals) {
      await q(`CREATE (:Signal{id:'${esc(sg.id)}', type:'${esc(sg.type)}', text:'${esc(sg.text)}', url:'${esc(sg.url)}', strength:${sg.strength}})`);
      await q(`MATCH (c:Company{id:'${esc(a.id)}'}), (g:Signal{id:'${esc(sg.id)}'}) CREATE (c)-[:HAS_SIGNAL]->(g)`);
    }
    if (a.currentVendor) {
      const k = ws.competitors.find((x) => x.name.toLowerCase().startsWith(a.currentVendor!.toLowerCase()));
      if (k) await q(`MATCH (c:Company{id:'${esc(a.id)}'}), (k:Competitor{id:'${esc(k.id)}'}) CREATE (c)-[:USES_VENDOR]->(k)`);
    }
    const pid = `p-${a.id}`;
    await q(`CREATE (:Person{id:'${pid}', name:'${esc(a.roles[0])} (name to verify)', role:'${esc(a.roles[0])}', verified:false})`);
    await q(`MATCH (p:Person{id:'${pid}'}), (c:Company{id:'${esc(a.id)}'}) CREATE (p)-[:WORKS_AT]->(c)`);
    if (lead.stage !== "matched") {
      const ch = s.drafts.find((d) => d.ws === wsId && d.accountId === a.id && d.status === "sent")?.channel ?? "email";
      await q(`MATCH (p:Person{id:'${pid}'}), (x:Channel{id:'${ch}'}) CREATE (p)-[:CONTACTED_VIA{at:'${lead.updatedAt}'}]->(x)`);
      if (["replied", "meeting", "closed"].includes(lead.stage)) await q(`MATCH (p:Person{id:'${pid}'}), (x:Channel{id:'${ch}'}) CREATE (p)-[:REPLIED_TO{at:'${lead.updatedAt}'}]->(x)`);
    }
  }
  // Network edges added by humans (for example a contact who previously worked at a prospect)
  await q("CREATE (:Person{id:'me', name:'Founder (you)', role:'Founder', verified:true})");
  await q("CREATE (:Company{id:'home', name:'Force Energy', industry:'agency', region:'-', tier:'-', score:0})");
  await q("MATCH (p:Person{id:'me'}), (c:Company{id:'home'}) CREATE (p)-[:WORKS_AT]->(c)");
  let n = 0;
  for (const e of s.extraEdges.filter((x) => x.ws === wsId)) {
    n++;
    const nid = `x${n}`;
    await q(`CREATE (:Person{id:'${nid}', name:'${esc(e.from)}', role:'Known contact', verified:true})`);
    await q(`MATCH (p:Person{id:'${nid}'}), (c:Company{id:'home'}) CREATE (p)-[:WORKS_AT]->(c)`);
    const target = ws.accounts.find((a) => a.id === e.to);
    if (target) await q(`MATCH (p:Person{id:'${nid}'}), (c:Company{id:'${esc(target.id)}'}) CREATE (p)-[:PREVIOUSLY_EMPLOYED_AT{note:'${esc(e.note)}'}]->(c)`);
  }
  return { db, c, q };
}

export const QUERIES: Record<string, { title: string; why: string; cypher: string }> = {
  displacement: {
    title: "Competitor displacement",
    why: "Accounts whose current vendor competes with our product.",
    cypher: "MATCH (co:Company)-[:USES_VENDOR]->(k:Competitor)-[:COMPETES_WITH]->(p:Product) RETURN co.name AS account, k.name AS incumbent, p.name AS our_product",
  },
  signals: {
    title: "Strong buying signals",
    why: "Multi-hop from company to signal to product, filtered by evidence strength.",
    cypher: "MATCH (co:Company)-[:HAS_SIGNAL]->(s:Signal), (co)-[:MATCHED_TO]->(p:Product) WHERE s.strength >= 0.7 RETURN co.name AS account, co.tier AS tier, s.type AS signal, s.text AS evidence, s.url AS source ORDER BY s.strength DESC, co.score DESC LIMIT 12",
  },
  warm: {
    title: "Warm introduction paths",
    why: "Known contacts who previously worked at a matched account, reached through our own network.",
    cypher: "MATCH (me:Person{id:'me'})-[:WORKS_AT]->(h:Company{id:'home'})<-[:WORKS_AT]-(k:Person)-[e:PREVIOUSLY_EMPLOYED_AT]->(co:Company)-[:MATCHED_TO]->(p:Product) RETURN k.name AS contact, co.name AS account, e.note AS note",
  },
  funnel: {
    title: "Reached and replied",
    why: "Persons contacted and replied, by channel.",
    cypher: "MATCH (pe:Person)-[c:CONTACTED_VIA]->(ch:Channel) OPTIONAL MATCH (pe)-[r:REPLIED_TO]->(ch) RETURN ch.name AS channel, count(c) AS contacted, count(r) AS replied",
  },
  agents: {
    title: "Who owns what",
    why: "Agents of the ecosystem connected to the product they run.",
    cypher: "MATCH (g:Agent)-[:OWNS]->(p:Product) RETURN g.name AS agent, g.duty AS duty, p.name AS product",
  },
};

export async function runQuery(s: State, wsId: string, key: string) {
  const g = await buildGraph(s, wsId);
  const spec = QUERIES[key];
  const r: any = await g.c.query(spec.cypher);
  const rows = await r.getAll();
  return { ...spec, rows };
}

export async function graphSnapshot(s: State, wsId: string) {
  const g = await buildGraph(s, wsId);
  const nodes: any[] = []; const edges: any[] = [];
  for (const [label, cols] of [["Company", "id, name, tier"], ["Competitor", "id, name, kind"], ["Product", "id, name"], ["Signal", "id, type"], ["Person", "id, role"], ["Channel", "id"], ["Agent", "id, name"]] as const) {
    const r: any = await g.c.query(`MATCH (n:${label}) RETURN ${cols.split(", ").map((x) => "n." + x).join(", ")}`);
    for (const row of await r.getAll()) nodes.push({ label, id: row["n.id"], name: row["n.name"] ?? row["n.type"] ?? row["n.role"] ?? row["n.id"], tier: row["n.tier"], kind: row["n.kind"] });
  }
  for (const rel of ["WORKS_AT", "PREVIOUSLY_EMPLOYED_AT", "COMPETES_WITH", "MATCHED_TO", "HAS_SIGNAL", "USES_VENDOR", "CONTACTED_VIA", "REPLIED_TO", "OWNS"]) {
    const r: any = await g.c.query(`MATCH (a)-[e:${rel}]->(b) RETURN a.id, b.id`);
    for (const row of await r.getAll()) edges.push({ type: rel, from: row["a.id"], to: row["b.id"] });
  }
  return { nodes, edges };
}
