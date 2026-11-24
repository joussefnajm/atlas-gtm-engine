# Atlas GTM Engine

A closed-loop go-to-market engine: product intake → ICP with confidence → cited discovery → knowledge graph → personalized outreach → **human approval** → pipeline and attribution, with usage metering.

Built for HackwithBay 4.0 (24 Nov 2026). Runs in two modes:

- **cache** (default, no keys): the ICP comes from a stored inference and discovery from public evidence collected on 2026-11-24. Every lead has a source URL.
- **live**: set `ANTHROPIC_API_KEY` (ICP inference), `TAVILY_API_KEY` (search), `HUNTER_API_KEY` (contact lookup), `FLEXPRICE_API_KEY` (metering). See `.env.example`.

## Run

```bash
npm install
npm run dev     # http://localhost:3100
```

Open **Intake** → *Run pipeline*. Switch workspace in the left bar (Force Energy solar in Santander, Colombia; Tinto Digital restaurants and catering in the Bay Area).

## What is new today and what already existed

| New today (this repository) | Already existed in the ecosystem (declared, reused as context) |
|---|---|
| The engine: intake, ICP, discovery, scoring, Kùzu graph, outreach, reviewer and security checks, approval queue, pipeline and analytics, metering | A team of AI agents with human approval gates, a strategic map, a weekly committee |
| File contract with the WhatsApp agent (approval queue out, decisions in) | The WhatsApp agent (daily numbered approval queue) |
| Flexprice-style event metering and credit gating | A production platform (CRM with stages, consultant network, audit log) |
| Seed evidence for three workspaces from public sources | Prospect research done earlier for the Tinto Digital pilot (public business information only) |

## Honest limits

- No message leaves the system. Dispatch is a **dry run** until a sender (Gmail, SendGrid, WhatsApp) is connected.
- Contacts are roles to verify; no email address is invented. Enrichment needs a provider key.
- Flexprice events follow the documented event shape (`event_name`, `external_customer_id`, `event_id`, `timestamp`, `properties`); the request header is not verified against a live account. Without a key, metering is local.
- Nexla and Teamily are planned adapters, not wired.
- Replies and meetings are simulated in a sandbox and labeled as such.
- Kùzu is embedded and in-memory per request; Neo4j can replace it behind `src/lib/graph.ts`.

## Layout

`src/lib/agents.ts` multi-agent run · `graph.ts` Kùzu graph and Cypher · `outreach.ts` drafting and review · `meter.ts` credits and Flexprice events · `yowasap.ts` approval queue contract · `llm.ts` live model, search and enrichment adapters · `data/seed.json` evidence.
