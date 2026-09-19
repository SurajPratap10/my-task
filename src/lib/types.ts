export const COMPANY_TYPES = [
  "startup",
  "scaleup",
  "enterprise",
  "agency",
] as const;

export type CompanyType = (typeof COMPANY_TYPES)[number];

export type PastCompany = {
  company: string;
  company_type: CompanyType;
  title: string;
  years: number;
};

export type Profile = {
  id: string;
  name: string;
  current_title: string;
  years_experience: number;
  location: string;
  current_company: string;
  current_company_type: CompanyType;
  skills: string[];
  past_companies: PastCompany[];
  education: string;
  summary: string;
};

export type SkillMatch = "any" | "all";
export type CompanyTypeScope = "current" | "current_or_past";
export type CriterionWeight = "must" | "strong" | "nice";
export type ScoreVerdict = "strong" | "possible" | "weak";

export type Filters = {
  skills: string[];
  skill_match: SkillMatch;
  min_years: number | null;
  max_years: number | null;
  locations: string[];
  location_strict: boolean;
  company_types: CompanyType[];
  company_type_scope: CompanyTypeScope;
  title_keywords: string[];
  excluded_ids: string[];
};

export type RubricCriterion = {
  name: string;
  weight: CriterionWeight;
  description: string;
};

export type Rubric = {
  summary: string;
  criteria: RubricCriterion[];
  deal_breakers: string[];
};

export type ScoreReason = {
  point: string;
  citation: string;
};

export type RankedProfile = {
  profile: Profile;
  score: number;
  verdict: ScoreVerdict;
  reasons: ScoreReason[];
};

export type FilterStats = {
  total: number;
  passed: number;
  dropped: {
    excluded: number;
    years: number;
    location: number;
    skills: number;
    company_type: number;
    title: number;
  };
};

export type SearchResult = {
  stats: FilterStats;
  ranked: RankedProfile[];
};

export type SpecChange = {
  path: string;
  before: string;
  after: string;
  why: string;
};

export type ChatRole = "recruiter" | "system";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
};

export type Vote = "yes" | "no";

export type AppError = {
  code: "config" | "rate_limit" | "timeout" | "malformed" | "unknown";
  message: string;
  retryable: boolean;
};

export type StatusPayload = {
  configured: boolean;
  provider: "gemini" | "groq" | null;
};
