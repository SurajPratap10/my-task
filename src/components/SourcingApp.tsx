"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, isAppError } from "@/lib/api";
import type {
  AppError,
  ChatMessage,
  Filters,
  RankedProfile,
  Rubric,
  SearchResult,
  SpecChange,
  StatusPayload,
  Vote,
} from "@/lib/types";
import { toShown } from "@/lib/sourcing-client";
import { FrozenScreen } from "./FrozenScreen";
import { LandingScreen } from "./LandingScreen";
import { ThinkingPanel } from "./ThinkingPanel";
import { Workspace } from "./Workspace";

type Phase = "landing" | "working" | "frozen";
type Busy = "parsing" | "scoring" | "refining" | null;

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function SourcingApp() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [phase, setPhase] = useState<Phase>("landing");
  const [busy, setBusy] = useState<Busy>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters | null>(null);
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [applied, setApplied] = useState<{ filters: Filters; rubric: Rubric } | null>(null);
  const [search, setSearch] = useState<SearchResult | null>(null);
  const [votes, setVotes] = useState<Record<string, Vote>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [changes, setChanges] = useState<SpecChange[]>([]);
  const [changeSummary, setChangeSummary] = useState<string | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [rounds, setRounds] = useState(0);
  const [landingError, setLandingError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadStatus() {
      try {
        const next = await apiGet<StatusPayload>("/api/status");
        if (!cancelled) setStatus(next);
      } catch {
        if (!cancelled) setStatus({ configured: false, provider: null });
      }
    }
    loadStatus();
    const onFocus = () => loadStatus();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const batch: RankedProfile[] = useMemo(() => search?.ranked.slice(0, 5) ?? [], [search]);
  const dirty =
    Boolean(filters && rubric && applied) &&
    JSON.stringify({ filters, rubric }) !== JSON.stringify(applied);

  async function scoreWith(nextFilters: Filters, nextRubric: Rubric) {
    setBusy("scoring");
    setError(null);
    try {
      const result = await apiPost<SearchResult>("/api/score", {
        filters: nextFilters,
        rubric: nextRubric,
      });
      setSearch(result);
      setApplied({ filters: nextFilters, rubric: nextRubric });
      setVotes({});
    } catch (caught) {
      setError(
        isAppError(caught)
          ? caught
          : { code: "unknown", message: "Scoring failed.", retryable: true },
      );
    } finally {
      setBusy(null);
    }
  }

  async function startSearch(nextQuery: string) {
    setQuery(nextQuery);
    setLandingError(null);
    setError(null);
    setBusy("parsing");
    setPhase("working");
    setSearch(null);
    setMessages([]);
    setChanges([]);
    setChangeSummary(null);
    setRounds(0);
    try {
      const spec = await apiPost<{ filters: Filters; rubric: Rubric }>("/api/parse", { query: nextQuery });
      setFilters(spec.filters);
      setRubric(spec.rubric);
      await scoreWith(spec.filters, spec.rubric);
    } catch (caught) {
      const payload = isAppError(caught)
        ? caught
        : { code: "unknown" as const, message: "Could not parse that search.", retryable: true };
      setPhase("landing");
      setBusy(null);
      setLandingError(payload.message);
    }
  }

  async function refine(message: string) {
    if (!filters || !rubric) return;
    setBusy("refining");
    setError(null);
    if (message) {
      setMessages((current) => [...current, { id: uid(), role: "recruiter", text: message }]);
    }
    try {
      const result = await apiPost<{
        filters: Filters;
        rubric: Rubric;
        summary: string;
        changes: SpecChange[];
        search: SearchResult;
      }>("/api/refine", {
        query,
        filters,
        rubric,
        shown: toShown(batch),
        votes,
        message,
      });
      setFilters(result.filters);
      setRubric(result.rubric);
      setApplied({ filters: result.filters, rubric: result.rubric });
      setSearch(result.search);
      setChanges(result.changes);
      setChangeSummary(result.summary);
      setVotes({});
      setRounds((value) => value + 1);
      setMessages((current) => [...current, { id: uid(), role: "system", text: result.summary }]);
    } catch (caught) {
      setError(
        isAppError(caught)
          ? caught
          : { code: "unknown", message: "Could not refine from that feedback.", retryable: true },
      );
    } finally {
      setBusy(null);
    }
  }

  function reset() {
    setPhase("landing");
    setBusy(null);
    setQuery("");
    setFilters(null);
    setRubric(null);
    setApplied(null);
    setSearch(null);
    setVotes({});
    setMessages([]);
    setChanges([]);
    setChangeSummary(null);
    setError(null);
    setRounds(0);
    setLandingError(null);
  }

  if (phase === "landing") {
    return (
      <LandingScreen
        status={status}
        error={landingError}
        busy={busy === "parsing"}
        onSubmit={startSearch}
      />
    );
  }

  if (phase === "frozen" && filters && rubric) {
    return (
      <FrozenScreen
        query={query}
        rounds={rounds}
        filters={filters}
        rubric={rubric}
        ranked={search?.ranked ?? []}
        onReset={reset}
      />
    );
  }

  if (!filters || !rubric) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-faint">Flexiple · Sourcing</p>
        <ThinkingPanel key="parsing" kind="parsing" />
      </div>
    );
  }

  return (
    <Workspace
      query={query}
      rounds={rounds}
      filters={filters}
      rubric={rubric}
      search={search}
      batch={batch}
      votes={votes}
      messages={messages}
      changes={changes}
      changeSummary={changeSummary}
      error={error}
      busy={busy}
      dirty={Boolean(dirty)}
      onFilters={setFilters}
      onRubric={setRubric}
      onApplyEdits={() => scoreWith(filters, rubric)}
      onVote={(id, vote) =>
        setVotes((current) => {
          const next = { ...current };
          if (next[id] === vote) delete next[id];
          else next[id] = vote;
          return next;
        })
      }
      onRefine={refine}
      onRetryScore={() => scoreWith(filters, rubric)}
      onFreeze={() => setPhase("frozen")}
      onReset={reset}
    />
  );
}
