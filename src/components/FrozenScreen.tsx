"use client";

import type { Filters, RankedProfile, Rubric } from "@/lib/types";
import { COMPANY_LABELS, WEIGHT_LABELS, yearsLabel } from "@/lib/format";

export function FrozenScreen({
  query,
  rounds,
  filters,
  rubric,
  ranked,
  onReset,
}: {
  query: string;
  rounds: number;
  filters: Filters;
  rubric: Rubric;
  ranked: RankedProfile[];
  onReset: () => void;
}) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-4xl overflow-x-hidden px-5 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-mark">Search frozen</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Final shortlist</h1>
          <p className="mt-2 text-sm text-muted break-words">
            {rounds} refinement {rounds === 1 ? "round" : "rounds"} · {ranked.length} ranked candidates
          </p>
          <p className="mt-1 text-xs text-faint break-words">{query}</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="shrink-0 rounded-lg border border-rule px-3 py-2 text-sm hover:bg-card"
        >
          New search
        </button>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="min-w-0 rounded-lg border border-rule bg-card p-4">
          <h2 className="text-sm font-semibold">Final filters</h2>
          <dl className="mt-3 space-y-2 text-xs">
            <Row label="Skills" value={filters.skills.join(", ") || "Any"} />
            <Row label="Tenure" value={yearsLabel(filters.min_years, filters.max_years)} />
            <Row label="Locations" value={filters.locations.join(", ") || "Any"} />
            <Row
              label="Company"
              value={
                filters.company_types.length
                  ? `${filters.company_types.map((type) => COMPANY_LABELS[type]).join(", ")} (${
                      filters.company_type_scope === "current" ? "current" : "current or past"
                    })`
                  : "Any"
              }
            />
            <Row label="Titles" value={filters.title_keywords.join(", ") || "Any"} />
          </dl>
        </div>
        <div className="min-w-0 rounded-lg border border-rule bg-card p-4">
          <h2 className="text-sm font-semibold">Final rubric</h2>
          <p className="mt-2 text-sm leading-snug break-words">{rubric.summary}</p>
          <ul className="mt-3 space-y-2">
            {rubric.criteria.map((criterion) => (
              <li key={criterion.name} className="text-xs break-words">
                <span className="font-medium">{criterion.name}</span>
                <span className="ml-1 text-faint">({WEIGHT_LABELS[criterion.weight]})</span>
                <p className="mt-0.5 text-muted">{criterion.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-8 min-w-0">
        <h2 className="text-sm font-semibold">Ranked shortlist</h2>
        <ol className="mt-3 divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-card">
          {ranked.map((item, index) => (
            <li key={item.profile.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium break-words">
                  <span className="mr-2 text-mark">{index + 1}.</span>
                  {item.profile.name}
                </p>
                <p className="mt-0.5 text-xs text-muted break-words">
                  {item.profile.current_title} · {item.profile.years_experience}y · {item.profile.location} ·{" "}
                  {item.profile.current_company}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed break-words">{item.reasons[0]?.point}</p>
              </div>
              <span className="shrink-0 text-xs font-medium text-muted">{item.score}</span>
            </li>
          ))}
        </ol>
        {ranked.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No candidates in the frozen list.</p>
        ) : null}
      </section>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-faint">{label}</dt>
      <dd className="text-right break-words">{value}</dd>
    </div>
  );
}
