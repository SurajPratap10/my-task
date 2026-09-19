import type { CompanyType, Filters, FilterStats, Profile } from "./types";

const LOCATION_ALIASES: Record<string, string[]> = {
  bangalore: ["bengaluru", "blr"],
  bengaluru: ["bangalore", "blr"],
  "delhi ncr": ["delhi", "noida", "gurgaon", "gurugram", "ncr"],
  delhi: ["delhi ncr", "noida", "gurgaon", "gurugram"],
  mumbai: ["bombay"],
};

function norm(value: string): string {
  return value.trim().toLowerCase();
}

function skillHits(required: string, profileSkills: string[]): boolean {
  const needle = norm(required);
  return profileSkills.some((skill) => {
    const hay = norm(skill);
    return hay === needle || hay.includes(needle) || needle.includes(hay);
  });
}

function locationHits(wanted: string, profileLocation: string): boolean {
  const a = norm(wanted);
  const b = norm(profileLocation);
  if (a === b || b.includes(a) || a.includes(b)) return true;
  const aliases = LOCATION_ALIASES[a] ?? [];
  return aliases.some((alias) => b === alias || b.includes(alias));
}

function companyTypeHits(profile: Profile, types: CompanyType[], scope: Filters["company_type_scope"]): boolean {
  if (types.length === 0) return true;
  if (types.includes(profile.current_company_type)) return true;
  if (scope === "current_or_past") {
    return profile.past_companies.some((past) => types.includes(past.company_type));
  }
  return false;
}

function titleHits(profile: Profile, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  const title = norm(profile.current_title);
  return keywords.some((keyword) => title.includes(norm(keyword)));
}

export function applyFilters(profiles: Profile[], filters: Filters): {
  passed: Profile[];
  stats: FilterStats;
} {
  const dropped = {
    excluded: 0,
    years: 0,
    location: 0,
    skills: 0,
    company_type: 0,
    title: 0,
  };
  const excluded = new Set(filters.excluded_ids);
  const passed: Profile[] = [];

  for (const profile of profiles) {
    if (excluded.has(profile.id)) {
      dropped.excluded += 1;
      continue;
    }
    if (filters.min_years != null && profile.years_experience < filters.min_years) {
      dropped.years += 1;
      continue;
    }
    if (filters.max_years != null && profile.years_experience > filters.max_years) {
      dropped.years += 1;
      continue;
    }
    if (filters.locations.length > 0) {
      const inCity = filters.locations.some((loc) => locationHits(loc, profile.location));
      const remoteIndia =
        !filters.location_strict &&
        norm(profile.location).includes("remote") &&
        norm(profile.location).includes("india");
      if (!inCity && !remoteIndia) {
        dropped.location += 1;
        continue;
      }
    }
    if (filters.skills.length > 0) {
      const hits = filters.skills.map((skill) => skillHits(skill, profile.skills));
      const ok = filters.skill_match === "all" ? hits.every(Boolean) : hits.some(Boolean);
      if (!ok) {
        dropped.skills += 1;
        continue;
      }
    }
    if (!companyTypeHits(profile, filters.company_types, filters.company_type_scope)) {
      dropped.company_type += 1;
      continue;
    }
    if (!titleHits(profile, filters.title_keywords)) {
      dropped.title += 1;
      continue;
    }
    passed.push(profile);
  }

  return {
    passed,
    stats: {
      total: profiles.length,
      passed: passed.length,
      dropped,
    },
  };
}

export function emptyFilters(): Filters {
  return {
    skills: [],
    skill_match: "any",
    min_years: null,
    max_years: null,
    locations: [],
    location_strict: true,
    company_types: [],
    company_type_scope: "current_or_past",
    title_keywords: [],
    excluded_ids: [],
  };
}
