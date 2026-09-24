# Flexiple Sourcing Refinement Loop

A single-session AI recruiter workflow: free-text hiring brief → structured filters + fit rubric → local talent search → LLM scoring → recruiter feedback → spec refinement → freeze.

Built for the Flexiple Engineering Challenge (time-boxed slice). No login, no persistence across sessions.

## Setup

**Requirements:** Node.js 18+, npm.

```bash
npm install
cp .env.example .env.local
```

Add your LLM key to `.env.local`, then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Production build (optional):

```bash
npm run build && npm start
```

## Environment variables

The app uses **real server-side LLM calls**. Set **one** of these in `.env.local` (never commit this file):

| Variable | Purpose |
| --- | --- |
| **`LLM_API_KEY`** | **Recommended.** Google Gemini ([AI Studio](https://aistudio.google.com/apikey)). Checked first. |
| `GEMINI_API_KEY` | Alias for Gemini (same as above). |
| `GROQ_API_KEY` | Fallback if no Gemini key ([Groq Console](https://console.groq.com/keys)). |

Example:

```bash
LLM_API_KEY=your_key_here
```

`.env.local` and other `.env*` files are gitignored. See [`.env.example`](.env.example) for the template.

## Sample data

All sourcing runs against [`data/profiles.json`](data/profiles.json) — **48 fictional candidate profiles** supplied for the assignment. There is no external database.

## User flow

1. **Search** — Recruiter enters a Google-style brief (e.g. RDS developers, 4–7 years, startups, Bangalore).
2. **Spec** — Server calls the LLM to produce **objective filters** and a **subjective fit rubric** (editable in the UI).
3. **Filter** — Filters are applied deterministically to `profiles.json`.
4. **Score** — LLM scores remaining profiles against the rubric; top **4–5** are shown with explanations that **cite actual profile fields**.
5. **Refine** — Recruiter uses chat and/or **Match / Not a fit** on numbered cards. The LLM updates filters and rubric; filtering and scoring **run again**. A **Search refined** summary shows what changed.
6. **Freeze** — Locks final filters, rubric, and ranked shortlist.

Session state lives in the browser only. Refresh starts a new session.

## Architecture

```
  Free-text brief
      ↓
  LLM (parse)  →  filters + rubric  [Zod validated]
      ↓
  Local filter engine  →  profiles.json (48)
      ↓
  LLM (score)  →  ranked profiles + cited reasons
      ↓
  Top 4–5 shown to recruiter
      ↓
  Feedback (chat + votes)
      ↓
  LLM (refine)  →  updated filters + rubric + change log
      ↓
  Re-filter + re-score  →  new batch
      ↓
  Freeze  →  final summary
```

**Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Zod.

| Area | Location |
| --- | --- |
| Filter engine | `src/lib/filter.ts` |
| LLM client (timeout, JSON parse, repair retry) | `src/lib/llm.ts` |
| Prompts (runtime) | `src/lib/prompts.ts` |
| Prompts (readable copies for review) | [`prompts/parse.md`](prompts/parse.md), [`prompts/score.md`](prompts/score.md), [`prompts/refine.md`](prompts/refine.md) |
| API routes | `src/app/api/parse`, `score`, `refine`, `status` |

**LLM behaviour:** Structured JSON outputs validated with Zod; one repair pass on malformed responses; 28s timeout; typed errors for missing key, rate limits, timeouts, and bad JSON. **Failed steps do not overwrite** the last valid filters, rubric, or results — the UI offers **Retry this step**.

Scoring runs in batches (12 profiles) with a follow-up pass for any IDs the model skipped.

## Decisions

### Prioritised

- **End-to-end refinement loop** with real LLM API calls (parse, score, refine).
- **Structured outputs** for anything rendered or applied (filters, rubric, scores, refine changelog).
- **Grounded match explanations** — each reason includes a citation tied to profile fields (skills, years, location, company, etc.).
- **Recruiter trust** — filters and rubric always visible and editable; after refine, a concrete **what changed** view (before → after + why).
- **Designed states** — first load, working/loading, empty filter results (with drop counts), LLM errors with retry, frozen summary.
- **Separation of concerns** — deterministic filtering locally; LLM only for interpretation, scoring, and refinement.

### Cut (and why)

| Cut | Reason |
| --- | --- |
| Authentication, multi-user roles | Out of assignment scope; time better spent on the loop. |
| Persistence / database | Single-session demo; `profiles.json` is the talent pool. |
| Simulated 98M-person index | Assignment supplies 48 profiles; focus is spec quality and refinement, not retrieval at scale. |
| Streaming tokens | Adds UI complexity without improving the core workflow in a 3h window. |
| Auto-refine on every click | Recruiters batch judgment; votes + message sent together on **Refine search**. |

## Project layout

```
data/profiles.json          # Talent pool (48 profiles)
prompts/                    # LLM prompts (review copies)
src/app/api/                # parse, score, refine, status
src/components/             # UI (landing, workspace, freeze)
src/lib/                    # filter, llm, schemas, sourcing
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
