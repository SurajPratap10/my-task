import { z } from "zod";
import { COMPANY_TYPES } from "./types";

export const companyTypeSchema = z.enum(COMPANY_TYPES);

export const filtersSchema = z.object({
  skills: z.array(z.string().min(1).max(60)).max(12),
  skill_match: z.enum(["any", "all"]),
  min_years: z.number().int().min(0).max(40).nullable(),
  max_years: z.number().int().min(0).max(40).nullable(),
  locations: z.array(z.string().min(1).max(40)).max(8),
  location_strict: z.boolean(),
  company_types: z.array(companyTypeSchema).max(4),
  company_type_scope: z.enum(["current", "current_or_past"]),
  title_keywords: z.array(z.string().min(1).max(40)).max(8),
  excluded_ids: z.array(z.string().min(1).max(12)).max(48),
});

export const rubricSchema = z.object({
  summary: z.string().min(8).max(400),
  criteria: z
    .array(
      z.object({
        name: z.string().min(2).max(80),
        weight: z.enum(["must", "strong", "nice"]),
        description: z.string().min(8).max(280),
      }),
    )
    .min(3)
    .max(6),
  deal_breakers: z.array(z.string().min(2).max(160)).max(6),
});

export const parseOutputSchema = z.object({
  filters: filtersSchema,
  rubric: rubricSchema,
});

export const scoreReasonSchema = z.object({
  point: z.string().min(8).max(240),
  citation: z.string().min(4).max(240),
});

export const profileScoreSchema = z.object({
  id: z.string().min(1).max(12),
  score: z.number().min(0).max(100),
  verdict: z.enum(["strong", "possible", "weak"]),
  reasons: z.array(scoreReasonSchema).min(1).max(4),
});

export const scoreOutputSchema = z.object({
  scores: z.array(profileScoreSchema).max(48),
});

export const specChangeSchema = z.object({
  path: z.string().min(2).max(80),
  before: z.string().min(1).max(240),
  after: z.string().min(1).max(240),
  why: z.string().min(8).max(280),
});

export const refineOutputSchema = z.object({
  filters: filtersSchema,
  rubric: rubricSchema,
  summary: z.string().min(12).max(400),
  changes: z.array(specChangeSchema).min(1).max(8),
});

export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
}
