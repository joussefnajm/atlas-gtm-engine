# System design

## 1. Flow

```
Intake (plain language)
  → ICP inference (fields, confidence 0-1, expansion segments)        llm.ts / cached inference
  → Discovery (public sources, mandatory URL per signal)              seed evidence or Tavily
  → Scoring (fit 0-70 + intent 0-30 → 0-100, Tier A/B/C)              scoring.ts
  → Knowledge graph (Kùzu, Cypher)                                    graph.ts
  → Enrichment (Hunter, counts only, never stores addresses)          llm.ts
  → Drafting (3 touches, two variants)                                outreach.ts
  → Reviewer (facts) + Security (links, PII, secrets, opt-out)        outreach.ts review()
  → Approval gateway (web or WhatsApp agent file contract)            yowasap.ts
  → Dispatch (dry run) → Pipeline, attribution, analytics             agents.ts / pipeline page
  Every billable step → metering event (credits, gating)              meter.ts
```

## 2. Graph ontology (Kùzu)

Nodes: `Company`, `Person` (role, verified flag), `Product`, `Competitor`, `Signal` (type, text, url, strength), `Channel`, `Agent`.
Edges: `WORKS_AT`, `PREVIOUSLY_EMPLOYED_AT`, `COMPETES_WITH`, `MATCHED_TO`, `HAS_SIGNAL`, `USES_VENDOR`, `CONTACTED_VIA`, `REPLIED_TO`, `OWNS`.

Queries (each is real Cypher, metered as `graph_query`):

- **Competitor displacement**: `(Company)-[:USES_VENDOR]->(Competitor)-[:COMPETES_WITH]->(Product)`.
- **Strong buying signals**: `(Company)-[:HAS_SIGNAL]->(Signal)` joined with `MATCHED_TO`, filtered by strength.
- **Warm introduction paths**: `(me)-[:WORKS_AT]->(home)<-[:WORKS_AT]-(contact)-[:PREVIOUSLY_EMPLOYED_AT]->(Company)-[:MATCHED_TO]->(Product)`. Returns nothing until a human adds a known contact; the UI says so instead of inventing a path.
- **Funnel by channel**: persons contacted and replied.
- **Who owns what**: the ecosystem agents connected to the product they run.

## 3. Reasoning loop and anti-hallucination rules

- A lead exists only with a source URL. Signals carry the URL, date and strength.
- The reviewer rejects drafts where any URL is not a cited source, any number is not in the evidence or the product intake, or a promise word appears (guarantee, a fixed percentage).
- The security pass rejects unlisted links, personal contact data in the body, secret-like strings, missing opt-out line (CAN-SPAM, Ley 1581), and names of AI tools.
- `/api/selftest` runs these checks on eight deliberately bad drafts (8 of 8 caught).
- Confidence on every ICP field; low confidence is shown, not hidden.

## 4. Human-in-the-loop

Nothing is sent without a person. Two gates: the web queue (approve, edit, reject) and the WhatsApp agent. The file contract:
`gtm_cola_<workspace>.md/.json` (out) and `gtm_decisiones.json` (in; `ref` plus `approve | reject | edit`). Schema changes (accepting an ICP expansion segment) are also human clicks written to the audit log.

## 5. Multi-agent layer

Roles mirror agents already running the ecosystem: Planner (strategic consultant), Builder (engineer and platform), Reviewer (legal and quality), Security, Approval gateway (WhatsApp agent and founder), Metering (CFO). The run log is the shared message stream; every entry is produced by code that ran. No external multi-agent product is integrated yet.

## 6. Metering and credits

Events: `icp_inferred`, `lead_discovered`, `lead_enriched`, `outreach_drafted`, `outreach_reviewed`, `outreach_sent`, `graph_query`, `approval_exported`. Each has a credit price; when the balance is too low the step is gated and the event is logged as blocked. With `FLEXPRICE_API_KEY` each event is also posted using the documented event shape (`event_name`, `external_customer_id`, `event_id`, `timestamp`, `properties`, `source`). The `event_id` makes retries idempotent. The auth header is unverified against a live account.

## 7. Workspaces

The engine is workspace-based. The demo workspace is Force Energy (solar and storage, Santander). Adding a company means adding an entry with product intake, ICP, competitors and accounts to `data/seed.json`.

## 8. Known gaps

Live search and enrichment need keys; senders are not connected; Neo4j is not used; Nexla and Teamily adapters are planned; replies are sandboxed.
