"use client";

import { useRef, useState } from "react";
import type { StatusPayload } from "@/lib/types";

const EXAMPLES = [
  "RDS developers with 4-7 years of experience who have worked at startups, for a role based in Bangalore.",
  "Senior frontend engineers in Bangalore with React and TypeScript, startup or scaleup background.",
  "Data engineers with Spark and Airflow, 5+ years, based in India.",
];

export function LandingScreen({
  status,
  error,
  busy,
  onSubmit,
}: {
  status: StatusPayload | null;
  error: string | null;
  busy: boolean;
  onSubmit: (query: string) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const statusLoading = status === null;
  const keyMissing = status !== null && !status.configured;
  const canSearch = !busy && !statusLoading && !keyMissing && query.trim().length >= 8;

  function useExample(text: string) {
    setQuery(text);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(text.length, text.length);
    });
  }

  function submitLabel() {
    if (busy) return "Working…";
    if (statusLoading) return "Checking setup…";
    if (keyMissing) return "API key required";
    return "Search";
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center overflow-x-hidden px-5 py-12 sm:px-6">
      <p className="text-xs font-medium text-muted">Flexiple · Sourcing</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Who are you hiring?</h1>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
        Describe the role in one sentence. We generate filters and a fit rubric, search 48 local profiles, score
        matches, and refine from your feedback until you freeze the search.
      </p>

      {statusLoading ? (
        <p className="mt-6 text-xs text-muted">Checking API key…</p>
      ) : null}

      {keyMissing ? (
        <div className="mt-6 rounded-lg border border-bad/25 bg-bad-soft px-4 py-3 text-sm text-bad break-words">
          Add <code className="font-mono text-xs">GROQ_API_KEY</code>,{" "}
          <code className="font-mono text-xs">LLM_API_KEY</code>, or{" "}
          <code className="font-mono text-xs">GEMINI_API_KEY</code> to{" "}
          <code className="font-mono text-xs">.env.local</code>, then stop the server (Ctrl+C) and run{" "}
          <code className="font-mono text-xs">npm run dev</code> again.
        </div>
      ) : null}

      {status?.configured ? (
        <p className="mt-6 text-xs text-good">Ready — {status.provider === "groq" ? "Groq" : "Gemini"} connected.</p>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-lg border border-bad/25 bg-bad-soft px-4 py-3 text-sm text-bad break-words">
          {error}
        </div>
      ) : null}

      <form
        className="mt-8"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSearch) onSubmit(query.trim());
        }}
      >
        <textarea
          ref={inputRef}
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="RDS developers with 4–7 years…"
          className="h-28 w-full max-w-full resize-none rounded-lg border border-rule bg-card px-4 py-3 text-base leading-relaxed text-ink outline-none focus:border-mark/50"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-faint">{query.trim().length}/500</p>
          <button
            type="submit"
            disabled={!canSearch}
            className="rounded-lg bg-ink px-4 py-2 text-sm text-white disabled:opacity-40"
          >
            {submitLabel()}
          </button>
        </div>
      </form>

      <div className="mt-8 min-w-0">
        <p className="text-xs text-muted">Example briefs — click to fill the box</p>
        <div className="mt-2 flex flex-col gap-1.5">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => useExample(example)}
              className="cursor-pointer rounded-lg border border-rule bg-card px-3 py-2.5 text-left text-xs leading-relaxed text-ink hover:border-mark/40 hover:bg-paper-2 break-words"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
