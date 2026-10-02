# CashReady P9 — Development Log

## Milestone 0 — Repository Reconnaissance
- **Work performed**:
  - Inspected git status, branch (`master`), commit history, root directory structure.
  - Inspected existing README, backend serving code (`api/main.py`), and artifacts in `artifacts/serve/` (`agents.json`, `metrics.json`, `plans/`, `lost_demand/`, `area_risk/`).
  - Identified team boundaries: `cashready/`, `api/`, and `artifacts/` are protected. All frontend work belongs in `web/`.
  - Identified key integration details: backend commit `15ca5ad` dropped `POST /agents/{id}/feedback`; plans currently store fixed opening cash for 90% risk with probability dicts; `metrics.json` values strictly align with requirements.
- **Files changed**:
  - Created implementation plan artifact (`implementation_plan.md`).
- **Tests / checks performed**:
  - `git status` clean check.
  - Inspected sample schema of `agents.json`, `metrics.json`, `plans/2026-10-02.json`, `lost_demand/2026-W40.json`, `area_risk/2026-10-02.json`.
- **Outcome**: Confirmed contracts, protected paths, and initial strategy.
- **Commit hash**: `1e3dc6f` (included with Milestone 1).
- **Blockers / dependencies**: None.

## Milestone 1 — Frontend Foundation
- **Work performed**:
  - Created Next.js 14 App Router project in `web/` with strict TypeScript, Tailwind CSS, Lucide React, and Recharts.
  - Configured design system tokens in `tailwind.config.ts` (soft-shell admin, `#F4F5F7` background, `#0D9488` teal accent, soft shadows, Hind Siliguri font).
  - Built root layout (`app/layout.tsx`) and global styles (`app/globals.css`) with accessible focus rings, button active press scaling, and prefers-reduced-motion.
  - Created responsive `Navigation.tsx` component with top desktop tab bar and mobile floating bottom pill bar.
  - Set up route placeholders: `/` (redirects to `/agent`), `/agent`, `/area`, `/evidence`, and `not-found`.
- **Files changed**:
  - `web/.gitignore`
  - `web/package.json`
  - `web/package-lock.json`
  - `web/tsconfig.json`
  - `web/next.config.mjs`
  - `web/postcss.config.js`
  - `web/tailwind.config.ts`
  - `web/app/globals.css`
  - `web/app/layout.tsx`
  - `web/app/page.tsx`
  - `web/app/agent/page.tsx`
  - `web/app/area/page.tsx`
  - `web/app/evidence/page.tsx`
  - `web/app/not-found.tsx`
  - `web/components/Navigation.tsx`
  - `web/lib/types.ts`
  - `web/DEVELOPMENT_LOG.md`
- **Tests / checks performed**:
  - `npm run build` ran successfully; static page generation passed for all routes.
  - TypeScript validation and ESLint passed with 0 errors.
- **Outcome**: Frontend foundation initialized and verified.
- **Commit hash**: `1e3dc6f`
- **Blockers / dependencies**: None.

## Milestone 2 — Data Layer and Mock Mode
- **Work performed**:
  - Created `web/lib/types.ts` with complete domain and API interfaces (`Agent`, `Area`, `AgentPlan`, `Reason`, `RiskLevel`, `AgentLostDemand`, `AreaRiskResponse`, `AreaLostDemandResponse`, `MetricsResponse`).
  - Created `web/lib/strings.ts` with domain-specific Bangla strings, BDT formatting helpers, and percentage helpers.
  - Created `web/lib/mock-data.ts` covering 20 agents across 4 areas (`A01` to `A04`), fixed demo date `2026-10-02`, demo week `2026-W40`, exact demo metrics (f1: 0.79, naive recovery: 71.9, mean correction: 69.7, CashReady recovery: 68.3, habit lost: 18.1%, CashReady lost: 1.4%, commission saved: 1,062,799 BDT).
  - Created `web/lib/api.ts` with dual-mode switch (`NEXT_PUBLIC_API_URL`), handling network error states, loading, and graceful handling of feedback when backend lacks the POST endpoint.
- **Files changed**:
  - `web/lib/types.ts`
  - `web/lib/strings.ts`
  - `web/lib/mock-data.ts`
  - `web/lib/api.ts`
  - `web/DEVELOPMENT_LOG.md`
- **Tests / checks performed**:
  - `npm run typecheck` passed with 0 errors.
  - `npm run build` succeeded cleanly with static compilation.
- **Outcome**: Dual-mode typed data layer ready and tested.
- **Commit hash**: `c4bd4c9`
- **Blockers / dependencies**: None.

## Milestone 3 — Agent Page (Hero Demo)
- **Work performed**:
  - Created `web/components/Skeleton.tsx` for loading state skeletons and Bangla error recovery component.
  - Implemented `/agent` hero layout: phone-sized max-w-md centered layout with date selector and searchable agent dropdown displaying agent ID and area.
  - Implemented Hero Plan card with 40px bold teal opening cash recommendation and 18px Bangla narrative message.
  - Implemented 3-way segmented risk control ("নিরাপদ ৮০% / ভারসাম্য ৯০% / সতর্ক ৯৫%") that updates opening cash dynamically according to the service level buffer formula.
  - Implemented SHAP reasons card with bi-directional impact bars (amber for positive risk, teal for risk reduction).
  - Implemented lost demand summary card with lost customer count, lost amount, and lost commission.
  - Implemented inline feedback card with "হ্যাঁ" / "না" buttons, submitting state, inline "ধন্যবাদ!" acknowledgment, and error retry without `alert()`.
- **Files changed**:
  - `web/components/Skeleton.tsx`
  - `web/app/agent/page.tsx`
  - `web/DEVELOPMENT_LOG.md`
- **Tests / checks performed**:
  - `npm run typecheck` passed with 0 errors.
  - `npm run build` succeeded; `/agent` route prerendered cleanly.
- **Outcome**: Agent view complete and verified.
- **Commit hash**: Pending git commit.
- **Blockers / dependencies**: None.
