import type { RankedProfile } from "./types";

export function toShown(batch: RankedProfile[]) {
  return batch.map((item, index) => ({
    number: index + 1,
    id: item.profile.id,
    name: item.profile.name,
    title: item.profile.current_title,
    years: item.profile.years_experience,
    location: item.profile.location,
    company: item.profile.current_company,
    company_type: item.profile.current_company_type,
    skills: item.profile.skills,
    score: item.score,
  }));
}
