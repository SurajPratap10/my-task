import type { Profile } from "./types";
import profiles from "../../data/profiles.json";

export function loadProfiles(): Profile[] {
  return profiles as Profile[];
}

export function compactProfile(profile: Profile) {
  return {
    id: profile.id,
    name: profile.name,
    current_title: profile.current_title,
    years_experience: profile.years_experience,
    location: profile.location,
    current_company: profile.current_company,
    current_company_type: profile.current_company_type,
    skills: profile.skills,
    past_companies: profile.past_companies.map(
      (past) => `${past.company} (${past.company_type}), ${past.title}, ${past.years}y`,
    ),
    education: profile.education,
    summary: profile.summary,
  };
}
