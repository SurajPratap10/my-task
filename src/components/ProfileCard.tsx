"use client";

import type { RankedProfile, Vote } from "@/lib/types";
import { COMPANY_LABELS } from "@/lib/format";

export function ProfileCard({
  index,
  item,
  vote,
  onVote,
  disabled,
}: {
  index: number;
  item: RankedProfile;
  vote?: Vote;
  onVote: (vote: Vote) => void;
  disabled?: boolean;
}) {
  const { profile, score, verdict, reasons } = item;
  const tone =
    verdict === "strong"
      ? "text-good bg-good-soft"
      : verdict === "possible"
        ? "text-warn bg-warn-soft"
        : "text-muted bg-paper-2";

  return (
    <article className="min-w-0 rounded-lg border border-rule bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-paper-2 text-sm font-semibold text-mark">
            {index}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{profile.name}</h3>
            <p className="mt-0.5 text-xs text-muted break-words">
              {profile.current_title} · {profile.current_company} ({COMPANY_LABELS[profile.current_company_type]})
            </p>
            <p className="mt-0.5 text-[11px] text-faint break-words">
              {profile.years_experience} yrs · {profile.location}
            </p>
          </div>
        </div>
        <div className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium capitalize ${tone}`}>
          {score} · {verdict}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {profile.skills.map((skill) => (
          <span key={skill} className="max-w-full truncate rounded bg-paper-2 px-1.5 py-0.5 text-[10px] text-muted">
            {skill}
          </span>
        ))}
      </div>

      <ul className="mt-3 space-y-2.5">
        {reasons.map((reason) => (
          <li key={reason.point} className="min-w-0">
            <p className="text-xs leading-relaxed break-words">{reason.point}</p>
            <p className="mt-1 rounded bg-paper-2 px-2 py-1 font-mono text-[10px] leading-relaxed text-faint break-words">
              {reason.citation}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onVote("yes")}
          className={`rounded-md px-2.5 py-1 text-xs ${
            vote === "yes" ? "bg-good text-white" : "bg-good-soft text-good ring-1 ring-good/20"
          }`}
        >
          Match
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onVote("no")}
          className={`rounded-md px-2.5 py-1 text-xs ${
            vote === "no" ? "bg-bad text-white" : "bg-bad-soft text-bad ring-1 ring-bad/20"
          }`}
        >
          Not a fit
        </button>
      </div>
    </article>
  );
}
