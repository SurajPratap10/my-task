import type { CompanyType, CriterionWeight, FilterStats } from "./types";

export const COMPANY_LABELS: Record<CompanyType, string> = {
  startup: "Startup",
  scaleup: "Scaleup",
  enterprise: "Enterprise",
  agency: "Agency",
};

export const WEIGHT_LABELS: Record<CriterionWeight, string> = {
  must: "Must",
  strong: "Strong",
  nice: "Nice",
};

export function yearsLabel(min: number | null, max: number | null): string {
  if (min != null && max != null) return `${min}–${max} yrs`;
  if (min != null) return `${min}+ yrs`;
  if (max != null) return `≤${max} yrs`;
  return "Any tenure";
}

export function joinList(items: string[], empty: string): string {
  if (items.length === 0) return empty;
  return items.join(" · ");
}

const CHANGE_LABELS: Record<string, string> = {
  "filters.min_years": "Minimum experience",
  "filters.max_years": "Maximum experience",
  "filters.skills": "Skills",
  "filters.locations": "Locations",
  "filters.company_types": "Company type",
  "filters.title_keywords": "Title keywords",
  "filters.excluded_ids": "Excluded profiles",
  "filters.location_strict": "Location strictness",
  "filters.company_type_scope": "Company scope",
  "rubric.summary": "Rubric summary",
};

export function labelChangePath(path: string): string {
  return CHANGE_LABELS[path] ?? path.replace(/^filters\.|^rubric\./, "");
}

export function dropSummary(stats: FilterStats): { label: string; count: number }[] {
  return [
    { label: "skills", count: stats.dropped.skills },
    { label: "years", count: stats.dropped.years },
    { label: "location", count: stats.dropped.location },
    { label: "company type", count: stats.dropped.company_type },
    { label: "title", count: stats.dropped.title },
    { label: "already rejected", count: stats.dropped.excluded },
  ].filter((row) => row.count > 0);
}
