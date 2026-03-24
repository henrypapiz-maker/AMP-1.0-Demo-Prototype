# M&A Integration Engine — v0.1 Pre-Demo

**AI-Driven Post-Merger Integration Platform**
Finance & Accounting · 443 Items · 12 Workstreams · Rules-First MVP

---

## What This Is

A working prototype of the M&A Integration Engine — a platform that transforms post-merger integration from spreadsheet-based chaos into a dynamic, intelligent workflow spanning Day 1 through Year 1 post-close.

**This v0 ships with:**
- PMO Dashboard with real-time workstream progress, KPI cards, and risk alerts
- 443-item Finance Readiness Checklist with filtering, grouping, and status management
- Risk Register with 7-category severity matrix and mitigation tracking
- Decision cascade from 12 intake fields across 3 tiers
- Demo deal ("Project Meridian") pre-loaded with realistic data
- Full Neon PostgreSQL schema with 10 tables + materialized views
- API routes for deals, checklist CRUD, and risk queries
- Demo mode (works without DB) for immediate advisor walkthroughs

---

## Quick Start

### 1. Clone & Install

```bash
git clone <repo-url>
cd ma-integration-engine
npm install
```

### 2. Demo Mode (No DB Required)

```bash
npm run dev
# Open http://localhost:3000
# Click "Project Meridian" → full dashboard with demo data
```

### 3. Full Setup with Neon

```bash
# Copy environment template
cp .env.example .env

# Add your Neon connection string to .env
# Get one at https://console.neon.tech (free tier works)

# Run database migration
npm run db:migrate

# Seed demo data
npm run db:seed

# Start dev server
npm run dev
```

### 4. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variable in Vercel dashboard:
# DATABASE_URL = your Neon connection string
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  FRONTEND: Next.js 14 App Router + Tailwind CSS     │
│  ├── Landing Page (deal selector)                    │
│  ├── PMO Dashboard (KPIs, progress, risks, timeline)│
│  ├── Checklist View (filter, group, status update)   │
│  └── Risk Register (severity matrix, mitigations)    │
├─────────────────────────────────────────────────────┤
│  API: Next.js Edge Routes                            │
│  ├── GET  /api/deals              (list deals)       │
│  ├── GET  /api/deals/:id          (dashboard data)   │
│  ├── GET  /api/deals/:id/checklist (filtered items)  │
│  ├── PATCH /api/deals/:id/checklist (status update)  │
│  └── GET  /api/deals/:id/risks    (risk register)    │
├─────────────────────────────────────────────────────┤
│  DATABASE: Neon PostgreSQL                           │
│  ├── organizations, users                            │
│  ├── deals, deal_intake                              │
│  ├── taxonomy_activities_master (443 items)           │
│  ├── deal_checklist_items (per-deal instances)        │
│  ├── taxonomy_risks_master (7 categories)             │
│  ├── deal_risk_register (per-deal risks)              │
│  ├── deal_workstream_config, deal_milestones          │
│  ├── audit_log                                       │
│  └── mv_deal_progress (materialized view)             │
└─────────────────────────────────────────────────────┘
```

---

## Database Schema

### Core Tables

| Table | Purpose | Records (Demo) |
|-------|---------|----------------|
| `organizations` | Multi-tenant org container | 1 |
| `users` | Team members (no auth yet) | 3 |
| `deals` | Deal entities with lifecycle stage | 1 |
| `deal_intake` | 12-field tiered intake (3 tiers) | 1 |
| `taxonomy_activities_master` | 443-item master checklist | ~120 (representative) |
| `deal_checklist_items` | Per-deal instantiated items | ~120 |
| `taxonomy_risks_master` | Risk detection rules | 7 |
| `deal_risk_register` | Per-deal active risks | 6 |
| `deal_workstream_config` | Workstream scoping per deal | 11 |
| `deal_milestones` | Timeline markers from close date | 7 |
| `audit_log` | Complete state change history | — |

### Key Design Decisions

- **JSONB for flexibility**: Intake payloads, risk indicators, and notes stored as JSONB
- **Materialized view** for dashboard aggregation (auto-refreshed on status change)
- **Source tracking**: Every checklist item traces back to master taxonomy version
- **Audit trail**: All state changes logged with timestamp, user, and reason

---

## 12 Workstreams

| Code | Workstream | Items |
|------|-----------|-------|
| TSA | TSA Assessment & Exit | 70 |
| CON | Consolidation & Reporting | 52 |
| OPS | Operational Accounting | 68 |
| ICX | Internal Controls & SOX | 44 |
| TAX | Income Tax & Compliance | 38 |
| TRE | Treasury & Banking | 32 |
| FPA | FP&A & Baselining | 28 |
| CYB | Cybersecurity & Data Privacy | 36 |
| ESG | ESG & Sustainability | 22 |
| PMO | Integration Budget & PMO | 35 |
| FAC | Facilities & Real Estate | 18 |
| INS | Insurance & Pensions | TBD |

---

## Project Structure

```
ma-integration-engine/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page (deal selector)
│   ├── globals.css             # Tailwind + custom styles
│   ├── intake/
│   │   └── page.tsx            # Deal Intake Form (3-tier + cascade)
│   ├── api/
│   │   ├── intake/route.ts     # POST: create deal from intake
│   │   └── deals/
│   │       ├── route.ts        # List deals
│   │       └── [dealId]/
│   │           ├── route.ts    # Dashboard aggregation
│   │           ├── checklist/route.ts  # Checklist CRUD
│   │           └── risks/route.ts      # Risk register
│   └── deal/[dealId]/
│       ├── layout.tsx          # Deal shell (sidebar)
│       ├── page.tsx            # PMO Dashboard
│       ├── checklist/page.tsx  # Checklist view
│       └── risks/page.tsx      # Risk register
├── components/
│   ├── AppShell.tsx            # Sidebar navigation
│   └── ui/index.tsx            # Badge, ProgressBar, KPICard, etc.
├── lib/
│   ├── cascade.ts              # Decision cascade engine (rules)
│   ├── db.ts                   # Neon connection
│   └── types.ts                # TypeScript types + display helpers
├── prisma/
│   ├── migration.sql           # Full database schema
│   ├── migrate.mjs             # Migration runner
│   └── seed/index.mjs          # Demo data seeder
├── package.json
├── tailwind.config.js
├── vercel.json
└── .env.example
```

---

## What's Next (Roadmap to MVP)

### Immediate (v0.2)
- [x] Deal Intake Form with decision cascade logic
- [ ] Team Assignment screen
- [ ] Full 443-item seed data (currently ~120 representative)
- [ ] Authentication (NextAuth.js)
- [ ] Real-time status updates (Neon Notify or polling)

### MVP (v0.5)
- [ ] AI Guidance (Claude API) — rules-first, per-item prompts
- [ ] SteerCo Report Generator (docx-js)
- [ ] TSA Manager screen
- [ ] Alert Center with deadline monitoring
- [ ] Export Center (xlsx, csv)

### Post-MVP
- [ ] Multi-deal support
- [ ] Role-based access control
- [ ] Taxonomy admin (master/instance feedback loop)
- [ ] LangGraph agentic workflow (Variant B)
- [ ] pgvector semantic search

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 14 + Tailwind | App Router, edge-ready, fast iteration |
| Database | Neon PostgreSQL | Serverless, scale-to-zero, branching |
| AI (future) | Claude API | Rules-first MVP, then AI enhancement |
| Charts | Recharts | React-native, composable |
| Hosting | Vercel | Zero-config, edge functions |
| Types | TypeScript + Zod | Full type safety |

---

## For Advisors / Demo Walkthrough

1. **Start at landing page** → shows active deals with key attributes
2. **Click "+ New Deal"** → Deal Intake Form with:
   - 3-tier progressive intake (Gate → Configuration → Enrichment)
   - 12 intake fields with visual selection widgets
   - **Live decision cascade preview** (right panel) showing:
     - Workstream activation matrix (scope per workstream updates in real-time)
     - Auto-detected risk flags based on selections
     - Required regulatory filings (HSR, EUMR, CFIUS, UK NSI)
     - Integration timeline computed from close date
   - "Generate Workflow" creates the full deal + checklist + risks
3. **Open Project Meridian** → PMO Dashboard with:
   - 5 KPI cards (progress, active, blocked, risks, workstreams)
   - Deal profile banner (structure, model, jurisdictions, GAAP, TSA)
   - Workstream progress table (11 workstreams, completion %)
   - Risk alerts sidebar (6 active risks, 1 critical)
   - Integration timeline (Pre-Close through Year 1)
3. **Navigate to Checklist** → filter by workstream, status, phase
   - Click items to expand detail view
   - Click status dot to cycle through states
   - Group by workstream, phase, or status
4. **Navigate to Risk Register** → severity summary cards
   - Expand any risk for full description, indicators, mitigations
   - Filter by severity or mitigation status
   - See related checklist items

---

*Built for M&A Integration · Finance & Accounting MVP · Pre-Demo v0.1*
