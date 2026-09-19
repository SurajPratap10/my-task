"use client";

import { useState } from "react";
import type { AppError, ChatMessage, Filters, RankedProfile, Rubric, SearchResult, SpecChange, Vote } from "@/lib/types";
import { dropSummary, labelChangePath } from "@/lib/format";
import { ProfileCard } from "./ProfileCard";
import { SpecPanel } from "./SpecPanel";
import { ThinkingPanel } from "./ThinkingPanel";

const CHIPS = [
  "1 is too junior, 2 and 4 are right",
  "Keep Bangalore only",
  "Care more about startup history than current company",
];

export function Workspace({
  query,
  rounds,
  filters,
  rubric,
  search,
  batch,
  votes,
  messages,
  changes,
  changeSummary,
  error,
  busy,
  dirty,
  onFilters,
  onRubric,
  onApplyEdits,
  onVote,
  onRefine,
  onRetryScore,
  onFreeze,
  onReset,
}: {
  query: string;
  rounds: number;
  filters: Filters;
  rubric: Rubric;
  search: SearchResult | null;
  batch: RankedProfile[];
  votes: Record<string, Vote>;
  messages: ChatMessage[];
  changes: SpecChange[];
  changeSummary: string | null;
  error: AppError | null;
  busy: "parsing" | "scoring" | "refining" | null;
  dirty: boolean;
  onFilters: (next: Filters) => void;
  onRubric: (next: Rubric) => void;
  onApplyEdits: () => void;
  onVote: (id: string, vote: Vote) => void;
  onRefine: (message: string) => void;
  onRetryScore: () => void;
  onFreeze: () => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState("");
  const voteCount = Object.keys(votes).length;
  const canRefine = Boolean(draft.trim() || voteCount);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-rule bg-card px-4 py-2.5 sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted">Sourcing session</p>
          <p className="truncate text-sm text-ink" title={query}>
            {query}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-xs text-faint sm:inline">
            Round {rounds}
            {search ? ` · ${search.stats.passed}/${search.stats.total} passed filters` : ""}
          </span>
          <button
            type="button"
            onClick={onReset}
            className="rounded-md border border-rule px-2.5 py-1.5 text-xs text-muted hover:bg-paper-2"
          >
            New
          </button>
          <button
            type="button"
            disabled={Boolean(busy) || !search}
            onClick={onFreeze}
            className="rounded-md bg-ink px-3 py-1.5 text-xs text-white disabled:opacity-40"
          >
            Freeze search
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)_minmax(0,16rem)] xl:grid-cols-[minmax(0,19rem)_minmax(0,1fr)_minmax(0,18rem)]">
        <div className="min-h-0 max-h-[38vh] overflow-hidden border-b border-rule lg:max-h-none lg:border-r lg:border-b-0">
          <SpecPanel
            filters={filters}
            rubric={rubric}
            onFilters={onFilters}
            onRubric={onRubric}
            onApply={onApplyEdits}
            dirty={dirty}
            disabled={Boolean(busy)}
          />
        </div>

        <section className="min-h-0 overflow-y-auto overscroll-contain scroll-thin border-b border-rule p-4 lg:border-r lg:border-b-0 sm:p-5">
          {busy ? (
            <ThinkingPanel key={busy} kind={busy} />
          ) : error && !search ? (
            <ErrorState error={error} onRetry={onRetryScore} />
          ) : search && search.ranked.length === 0 ? (
            <EmptyState stats={search.stats} />
          ) : (
            <div className="mx-auto w-full max-w-2xl min-w-0">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold tracking-tight">Top matches</h2>
                  <p className="text-xs text-muted">
                    Showing {batch.length} of {search?.stats.passed ?? 0} who passed filters (ranked by fit)
                  </p>
                </div>
              </div>

              {changeSummary ? (
                <div className="mb-4 rounded-lg border border-mark/30 bg-mark-soft/40 px-4 py-3">
                  <p className="text-xs font-medium text-mark">Search refined</p>
                  <p className="mt-1 text-sm leading-relaxed break-words">{changeSummary}</p>
                  {changes.length > 0 ? (
                    <ul className="mt-3 space-y-2 border-t border-rule/80 pt-3">
                      {changes.map((change) => (
                        <li key={`${change.path}-${change.after}`} className="text-xs leading-relaxed break-words">
                          <span className="font-medium text-ink">{labelChangePath(change.path)}</span>
                          {": "}
                          <span className="text-muted line-through">{change.before}</span>
                          {" → "}
                          <span className="text-ink">{change.after}</span>
                          <span className="mt-0.5 block text-faint">{change.why}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              {error ? <ErrorState error={error} onRetry={onRetryScore} /> : null}

              <div className="space-y-3">
                {batch.map((item, index) => (
                  <ProfileCard
                    key={item.profile.id}
                    index={index + 1}
                    item={item}
                    vote={votes[item.profile.id]}
                    onVote={(vote) => onVote(item.profile.id, vote)}
                    disabled={Boolean(busy)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="flex min-h-0 max-h-[42vh] flex-col overflow-hidden p-4 lg:max-h-none sm:p-5">
          <div className="shrink-0">
            <h2 className="text-sm font-semibold">Refine</h2>
            <p className="mt-0.5 text-xs text-muted">Number profiles in chat, or use Match / Not a fit, then send.</p>
          </div>

          <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain scroll-thin pr-0.5">
            {messages.length === 0 ? (
              <p className="text-xs leading-relaxed text-faint">
                Example: &ldquo;1 is too junior. 2 and 4 are good.&rdquo; We update filters and rubric, then re-run
                local filtering and scoring.
              </p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-full rounded-lg px-3 py-2 text-xs leading-relaxed break-words ${
                    message.role === "recruiter" ? "ml-4 bg-ink text-white" : "mr-2 bg-paper-2 text-ink"
                  }`}
                >
                  {message.text}
                </div>
              ))
            )}
          </div>

          <div className="mt-2 flex shrink-0 flex-wrap gap-1">
            {CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={Boolean(busy)}
                onClick={() => setDraft(chip)}
                className="max-w-full truncate rounded-md bg-paper-2 px-2 py-1 text-[11px] text-muted hover:bg-rule/60"
                title={chip}
              >
                {chip}
              </button>
            ))}
          </div>

          {voteCount > 0 ? (
            <p className="mt-2 shrink-0 text-[11px] text-muted">{voteCount} vote(s) included with your message.</p>
          ) : null}

          <form
            className="mt-2 shrink-0"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canRefine || busy) return;
              onRefine(draft.trim());
              setDraft("");
            }}
          >
            <textarea
              value={draft}
              disabled={Boolean(busy)}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="1 is too junior…"
              className="h-20 w-full max-w-full resize-none rounded-lg border border-rule bg-card px-3 py-2 text-sm outline-none focus:border-mark/50"
            />
            <button
              type="submit"
              disabled={!canRefine || Boolean(busy)}
              className="mt-2 w-full rounded-lg bg-mark px-4 py-2 text-sm text-white disabled:opacity-40"
            >
              {busy === "refining" ? "Refining…" : "Refine search"}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: AppError; onRetry: () => void }) {
  return (
    <div className="mb-4 rounded-lg border border-bad/25 bg-bad-soft px-4 py-3">
      <p className="text-sm font-medium text-bad">Something went wrong</p>
      <p className="mt-1 text-sm text-bad/90 break-words">{error.message}</p>
      <p className="mt-2 text-xs text-muted">Your current filters and last results were not overwritten.</p>
      {error.retryable ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md bg-card px-3 py-1.5 text-xs font-medium text-ink ring-1 ring-rule hover:bg-paper-2"
        >
          Retry this step
        </button>
      ) : null}
    </div>
  );
}

function EmptyState({ stats }: { stats: SearchResult["stats"] }) {
  const drops = dropSummary(stats);
  return (
    <div className="flex min-h-[16rem] flex-col justify-center py-8">
      <h2 className="text-lg font-semibold">No candidates passed the filters</h2>
      <p className="mt-2 max-w-md text-sm text-muted break-words">
        0 of {stats.total} profiles matched. Loosen filters on the left, or describe what to relax in Refine.
      </p>
      <ul className="mt-4 space-y-1 text-xs text-muted">
        {drops.map((row) => (
          <li key={row.label}>
            {row.count} removed by {row.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
