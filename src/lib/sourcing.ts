import { applyFilters } from "./filter";
import { completeJson } from "./llm";
import { compactProfile, loadProfiles } from "./profiles";
import { PARSE_SYSTEM, REFINE_SYSTEM, SCORE_SYSTEM } from "./prompts";
import { parseOutputSchema, refineOutputSchema, scoreOutputSchema } from "./schemas";
import type {
  Filters,
  RankedProfile,
  Rubric,
  SearchResult,
  SpecChange,
  Vote,
} from "./types";

const BATCH = 12;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function verdictFromScore(score: number): RankedProfile["verdict"] {
  if (score >= 75) return "strong";
  if (score >= 50) return "possible";
  return "weak";
}

export async function parseQuery(query: string): Promise<{ filters: Filters; rubric: Rubric }> {
  const parsed = await completeJson({
    system: PARSE_SYSTEM,
    user: `Recruiter search:\n${query}`,
    schema: parseOutputSchema,
  });
  return {
    filters: { ...parsed.filters, excluded_ids: [] },
    rubric: parsed.rubric,
  };
}

export async function runSearch(filters: Filters, rubric: Rubric): Promise<SearchResult> {
  const { passed, stats } = applyFilters(loadProfiles(), filters);
  if (passed.length === 0) return { stats, ranked: [] };

  const byId = new Map(passed.map((profile) => [profile.id, profile]));
  const scores = new Map<string, Omit<RankedProfile, "profile">>();

  const groups = chunk(passed, BATCH);
  const batchOutputs = await Promise.all(
    groups.map((group) =>
      completeJson({
        system: SCORE_SYSTEM,
        user: `Rubric:\n${JSON.stringify(rubric, null, 2)}\n\nProfiles:\n${JSON.stringify(group.map(compactProfile))}`,
        schema: scoreOutputSchema,
      }),
    ),
  );
  for (const output of batchOutputs) {
    for (const row of output.scores) {
      if (!byId.has(row.id)) continue;
      const reasons = row.reasons.filter((reason) => reason.citation.trim().length >= 4);
      if (reasons.length === 0) continue;
      scores.set(row.id, {
        score: Math.round(row.score),
        verdict: verdictFromScore(row.score),
        reasons,
      });
    }
  }

  const missing = passed.filter((profile) => !scores.has(profile.id));
  if (missing.length > 0 && missing.length <= BATCH) {
    const output = await completeJson({
      system: SCORE_SYSTEM,
      user: `Score ONLY these missing profiles.\nRubric:\n${JSON.stringify(rubric, null, 2)}\n\nProfiles:\n${JSON.stringify(missing.map(compactProfile))}`,
      schema: scoreOutputSchema,
    });
    for (const row of output.scores) {
      const profile = byId.get(row.id);
      if (!profile) continue;
      scores.set(row.id, {
        score: Math.round(row.score),
        verdict: verdictFromScore(row.score),
        reasons: row.reasons,
      });
    }
  }

  const ranked: RankedProfile[] = passed
    .map((profile) => {
      const scored = scores.get(profile.id);
      if (!scored) {
        return {
          profile,
          score: 40,
          verdict: "weak" as const,
          reasons: [
            {
              point: "Passed filters, but the model did not return a usable score on this pass.",
              citation: `${profile.current_title} · ${profile.years_experience}y · ${profile.location} · ${profile.current_company} (${profile.current_company_type})`,
            },
          ],
        };
      }
      return { profile, ...scored };
    })
    .sort((a, b) => b.score - a.score);

  return { stats, ranked };
}

export type ShownProfile = {
  number: number;
  id: string;
  name: string;
  title: string;
  years: number;
  location: string;
  company: string;
  company_type: string;
  skills: string[];
  score: number;
};

export async function refineSpec(input: {
  query: string;
  filters: Filters;
  rubric: Rubric;
  shown: ShownProfile[];
  votes: Record<string, Vote>;
  message: string;
}): Promise<{ filters: Filters; rubric: Rubric; summary: string; changes: SpecChange[] }> {
  const voteLines = input.shown.map((person) => {
    const vote = input.votes[person.id];
    const label = vote === "yes" ? "MATCH" : vote === "no" ? "NOT A FIT" : "no vote";
    return `${person.number}. ${person.id} ${person.name} — ${label} — ${person.title}, ${person.years}y, ${person.location}, ${person.company} (${person.company_type}), skills: ${person.skills.join(", ")}, score ${person.score}`;
  });

  const refined = await completeJson({
    system: REFINE_SYSTEM,
    user: `Original search:\n${input.query}

Current filters:
${JSON.stringify(input.filters, null, 2)}

Current rubric:
${JSON.stringify(input.rubric, null, 2)}

Numbered batch the recruiter is looking at:
${voteLines.join("\n")}

Recruiter chat:
${input.message.trim() || "(no chat — use the votes only)"}`,
    schema: refineOutputSchema,
  });

  const excluded = new Set([
    ...input.filters.excluded_ids,
    ...refined.filters.excluded_ids,
    ...Object.entries(input.votes).filter(([, vote]) => vote === "no").map(([id]) => id),
  ]);

  return {
    filters: { ...refined.filters, excluded_ids: [...excluded] },
    rubric: refined.rubric,
    summary: refined.summary,
    changes: refined.changes,
  };
}

