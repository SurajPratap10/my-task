"use client";

import { useState } from "react";

export function TagInput({
  values,
  onChange,
  placeholder,
  disabled,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const value = raw.trim();
    if (!value) return;
    if (values.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...values, value]);
    setDraft("");
  }

  return (
    <div className="flex max-w-full flex-wrap gap-1.5 rounded-md border border-rule bg-card px-2 py-2 focus-within:border-mark/50">
      {values.map((value) => (
        <button
          key={value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(values.filter((item) => item !== value))}
          className="rounded-full bg-paper-2 px-2.5 py-0.5 text-[11px] tracking-wide text-ink hover:bg-mark-soft"
        >
          {value}
          <span className="ml-1 text-faint">×</span>
        </button>
      ))}
      <input
        value={draft}
        disabled={disabled}
        placeholder={values.length === 0 ? placeholder : "Add"}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            commit(draft);
          }
          if (event.key === "Backspace" && !draft && values.length > 0) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={() => commit(draft)}
        className="min-w-[7rem] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-faint"
      />
    </div>
  );
}
