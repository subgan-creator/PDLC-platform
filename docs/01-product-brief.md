# 01 — Product Brief

Source: `00-brief.md` (repo root), Section A. This document restates it as the living product brief; when the two disagree, treat `00-brief.md` as historical source material and this file plus ADRs as current intent.

## What we're building

An enterprise PDLC platform for large, agile-immature organizations — banks, pharma, consumer goods. One place to run the full lifecycle from discovery through go-to-market and reporting. It opinionatedly teaches good product practice through the structure of the workflow rather than through training.

**The differentiating bet: context-switch reduction.** Enterprise PMs juggle 5–15 initiatives across Jira, Confluence, Figma, SharePoint, email, Slack/Teams, ServiceNow, and ~6 recurring forums. The platform's job is to make "pick up where I left off on initiative X" a 5-second operation instead of a 20-minute one.

## Personas (build order)

| #   | Persona            | Scope                                                        | Phase                         |
| --- | ------------------ | ------------------------------------------------------------ | ----------------------------- |
| 1   | Product Manager    | One or more scrum teams; owns initiatives, backlog, delivery | v1 — full build               |
| 2   | Area Product Owner | A product area; portfolio across several PMs                 | v2                            |
| 3   | Product Executive  | A business line / product P&L                                | v2                            |
| 4   | Designer           | Wireframes, flows, design system                             | v1 — read/collaborate         |
| 5   | Engineer           | Consumes stories, ACs, NFRs                                  | v1 — read-only                |
| 6   | Researcher         | Discovery, interviews, synthesis                             | v1 — contributes to Discovery |
| 7   | Control / Risk     | Policy and control attestation                               | v2                            |
| 8   | Governance         | Stage gates, intake, funding approvals                       | v2                            |
| 9   | Stakeholders       | Business partners consuming updates                          | v1 — read-only                |
| 10  | Senior Management  | Portfolio rollups, exec reporting                            | v2                            |

**Architectural rule from day one:** personas are RBAC roles + view compositions over one shared domain model. Never fork the data model per persona. Every phase-1 entity carries the fields later personas need (control mappings, stage-gate state, portfolio hierarchy) even if no UI exposes them yet — see `packages/shared-types`.

## JTBD → modules

1. **Discovery & research** (Discovery Hub) — Sources, Evidence, Insights, Opportunities, Opportunity Solution Tree. Trail preserved so any initiative can answer "why are we doing this?"
2. **Manage the roadmap** (Initiative Workspace + Roadmap) — the spine: problem statement, outcomes/metrics, hypotheses, scope, phases, RAID, stakeholders, health. Now/Next/Later + capacity-aware timeline.
3. **Design collaboration** (Experience Workspace) — brief + flows from PM, wireframes/screens from designer; embedded Figma frames, versioned links, review/approval loop.
4. **Definition** (Definition Workspace) — Epic → Feature → Story with AI-assisted drafting (flag-gated), Given/When/Then ACs, DoR checks, traceability matrix; plus:
   - **4a Process modeling** — current/target state flows, diagram-as-data, explicit delta.
   - **4b Business rules** — first-class register: rule ID, condition/action, owner, source, effective dates, coverage.
   - **4c Policy & controls** — control register per initiative: applicable policies, impacted controls, evidence, attestation. Makes the product credible in a bank or pharma.
5. **Go-to-market & launch** (Launch Workspace) — checklist by workstream, readiness score, post-launch feedback, exec presentation generation.
6. **Reporting across forums** (Reporting Studio) — one data model, many audience-tuned templates, auto-populated, exportable (PPTX/PDF/email/Confluence), delta-since-last-report.
7. **Testing & quality** (Quality Workspace) — test strategy, cases linked to ACs/rules, UAT with business testers, defect triage, coverage gaps.
8. **Context Switching** (cross-cutting, signature capability) — see below.

## The Context Engine (A4)

Every user action emits an activity event. From that stream: **My Day** (ranked landing page), **Resume Card** (per-initiative "what changed since you left"), **Context Capsule** (pre-meeting brief), **Handoff Pack** (leave/reorg/escalation export), **Unified Inbox** (mentions/approvals/notifications), **Decision Log** (date/owner/options/rationale — the single highest-value artifact for context recovery and governance).

**Design constraint:** a PM returning after a week reaches "I know what to do next" in under 60 seconds without opening any other tool.

## Enterprise NFRs, integration strategy, and tech stack

See [04-nfr.md](04-nfr.md), [05-integration-strategy.md](05-integration-strategy.md), and `CLAUDE.md` (tech stack + engineering rules) respectively.

## Build sequence

See the Module map table in `CLAUDE.md` (mirrors `00-brief.md` A8).
