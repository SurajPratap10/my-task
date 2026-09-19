"use client";

import { COMPANY_TYPES } from "@/lib/types";
import type { CompanyType, Filters, Rubric, RubricCriterion } from "@/lib/types";
import { COMPANY_LABELS, WEIGHT_LABELS, yearsLabel } from "@/lib/format";
import { TagInput } from "./TagInput";

export function SpecPanel({
  filters,
  rubric,
  onFilters,
  onRubric,
  onApply,
  dirty,
  disabled,
}: {
  filters: Filters;
  rubric: Rubric;
  onFilters: (next: Filters) => void;
  onRubric: (next: Rubric) => void;
  onApply: () => void;
  dirty: boolean;
  disabled?: boolean;
}) {
  function toggleType(type: CompanyType) {
    const has = filters.company_types.includes(type);
    onFilters({
      ...filters,
      company_types: has
        ? filters.company_types.filter((item) => item !== type)
        : [...filters.company_types, type],
    });
  }

  function updateCriterion(index: number, patch: Partial<RubricCriterion>) {
    onRubric({
      ...rubric,
      criteria: rubric.criteria.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  }

  return (
    <aside className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-thin p-4 sm:p-5">
        <section>
          <h2 className="text-sm font-semibold">Filters</h2>
          <p className="text-xs text-muted">Applied locally to data/profiles.json (48 people).</p>

          <label className="mb-1 mt-4 block text-xs text-muted">Skills</label>
          <TagInput
            values={filters.skills}
            disabled={disabled}
            placeholder="AWS RDS"
            onChange={(skills) => onFilters({ ...filters, skills })}
          />
          <div className="mt-2 flex flex-wrap gap-1">
            {(["any", "all"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                disabled={disabled}
                onClick={() => onFilters({ ...filters, skill_match: mode })}
                className={`rounded-md px-2 py-0.5 text-[11px] ${
                  filters.skill_match === mode ? "bg-ink text-white" : "bg-paper-2 text-muted"
                }`}
              >
                Match {mode}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="min-w-0">
              <label className="mb-1 block text-xs text-muted">Min years</label>
              <input
                type="number"
                min={0}
                max={40}
                disabled={disabled}
                value={filters.min_years ?? ""}
                placeholder="—"
                onChange={(event) =>
                  onFilters({
                    ...filters,
                    min_years: event.target.value === "" ? null : Number(event.target.value),
                  })
                }
                className="w-full min-w-0 rounded-md border border-rule bg-card px-2 py-1.5 text-sm outline-none focus:border-mark/50"
              />
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-xs text-muted">Max years</label>
              <input
                type="number"
                min={0}
                max={40}
                disabled={disabled}
                value={filters.max_years ?? ""}
                placeholder="—"
                onChange={(event) =>
                  onFilters({
                    ...filters,
                    max_years: event.target.value === "" ? null : Number(event.target.value),
                  })
                }
                className="w-full min-w-0 rounded-md border border-rule bg-card px-2 py-1.5 text-sm outline-none focus:border-mark/50"
              />
            </div>
          </div>
          <p className="mt-1 text-[11px] text-faint">{yearsLabel(filters.min_years, filters.max_years)}</p>

          <label className="mb-1 mt-3 block text-xs text-muted">Locations</label>
          <TagInput
            values={filters.locations}
            disabled={disabled}
            placeholder="Bangalore"
            onChange={(locations) => onFilters({ ...filters, locations })}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => onFilters({ ...filters, location_strict: !filters.location_strict })}
            className="mt-1.5 text-[11px] text-mark hover:underline"
          >
            {filters.location_strict ? "Strict city only" : "Include Remote — India"}
          </button>

          <p className="mb-1 mt-3 text-xs text-muted">Company type</p>
          <div className="flex flex-wrap gap-1">
            {COMPANY_TYPES.map((type) => {
              const on = filters.company_types.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleType(type)}
                  className={`rounded-md px-2 py-0.5 text-[11px] ${
                    on ? "bg-ink text-white" : "bg-paper-2 text-muted"
                  }`}
                >
                  {COMPANY_LABELS[type]}
                </button>
              );
            })}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {(["current_or_past", "current"] as const).map((scope) => (
              <button
                key={scope}
                type="button"
                disabled={disabled}
                onClick={() => onFilters({ ...filters, company_type_scope: scope })}
                className={`rounded-md px-2 py-0.5 text-[11px] ${
                  filters.company_type_scope === scope ? "bg-ink text-white" : "bg-paper-2 text-muted"
                }`}
              >
                {scope === "current" ? "Current co." : "Current or past"}
              </button>
            ))}
          </div>

          <label className="mb-1 mt-3 block text-xs text-muted">Title keywords</label>
          <TagInput
            values={filters.title_keywords}
            disabled={disabled}
            placeholder="Backend"
            onChange={(title_keywords) => onFilters({ ...filters, title_keywords })}
          />
        </section>

        <div className="my-5 h-px bg-rule" />

        <section>
          <h2 className="text-sm font-semibold">Fit rubric</h2>
          <textarea
            disabled={disabled}
            value={rubric.summary}
            onChange={(event) => onRubric({ ...rubric, summary: event.target.value })}
            className="mt-2 w-full max-w-full resize-none rounded-md border border-rule bg-card px-3 py-2 text-sm leading-snug outline-none focus:border-mark/50"
            rows={3}
          />
          <ul className="mt-3 space-y-2">
            {rubric.criteria.map((criterion, index) => (
              <li key={`${criterion.name}-${index}`} className="rounded-md border border-rule bg-card p-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <input
                    disabled={disabled}
                    value={criterion.name}
                    onChange={(event) => updateCriterion(index, { name: event.target.value })}
                    className="min-w-0 flex-1 bg-transparent text-xs font-medium outline-none"
                  />
                  <select
                    disabled={disabled}
                    value={criterion.weight}
                    onChange={(event) =>
                      updateCriterion(index, { weight: event.target.value as RubricCriterion["weight"] })
                    }
                    className="shrink-0 rounded-md bg-paper-2 px-1.5 py-0.5 text-[10px] outline-none"
                  >
                    {Object.entries(WEIGHT_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  disabled={disabled}
                  value={criterion.description}
                  onChange={(event) => updateCriterion(index, { description: event.target.value })}
                  className="mt-1.5 w-full max-w-full resize-none bg-transparent text-[11px] leading-relaxed text-muted outline-none"
                  rows={2}
                />
              </li>
            ))}
          </ul>
          <label className="mb-1 mt-3 block text-xs text-muted">Deal-breakers</label>
          <TagInput
            values={rubric.deal_breakers}
            disabled={disabled}
            placeholder="Agency-only"
            onChange={(deal_breakers) => onRubric({ ...rubric, deal_breakers })}
          />
        </section>
      </div>

      {dirty ? (
        <div className="shrink-0 border-t border-rule bg-card p-3">
          <button
            type="button"
            disabled={disabled}
            onClick={onApply}
            className="w-full rounded-md bg-ink px-3 py-2 text-xs text-white"
          >
            Apply edits & re-score
          </button>
        </div>
      ) : null}
    </aside>
  );
}
