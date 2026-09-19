"use client";

import { useEffect, useState } from "react";

const COPY: Record<"parsing" | "scoring" | "refining", string[]> = {
  parsing: ["Reading your brief", "Building filters", "Drafting fit rubric"],
  scoring: ["Filtering 48 profiles locally", "Scoring matches with the model"],
  refining: ["Reading feedback", "Updating filters and rubric", "Re-running search"],
};

export function ThinkingPanel({ kind }: { kind: "parsing" | "scoring" | "refining" }) {
  const steps = COPY[kind];
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStep((current) => Math.min(current + 1, steps.length - 1));
    }, 1400);
    return () => window.clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="flex min-h-[14rem] flex-col justify-center py-6">
      <p className="text-xs text-muted">Working…</p>
      <p className="mt-2 text-lg font-medium">{steps[step]}</p>
      <div className="mt-5 h-1 w-full max-w-md overflow-hidden rounded-full bg-paper-2">
        <div className="thinking-bar h-full rounded-full bg-mark" />
      </div>
      <ul className="mt-5 space-y-1.5">
        {steps.map((label, index) => (
          <li key={label} className={`text-xs ${index <= step ? "text-ink" : "text-faint"}`}>
            {index <= step ? "●" : "○"} {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
