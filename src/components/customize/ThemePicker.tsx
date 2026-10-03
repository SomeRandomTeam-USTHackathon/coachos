"use client";

import { PORTAL_THEMES } from "@/lib/portal";
import type { PortalThemeId } from "@/lib/types";

interface Props {
  value: PortalThemeId;
  accent: string;
  onChange: (id: PortalThemeId) => void;
}

export default function ThemePicker({ value, accent, onChange }: Props) {
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-3">
      {PORTAL_THEMES.map((t) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            aria-pressed={selected}
            className={`rounded-2xl border p-4 text-left transition-colors ${
              selected ? "border-transparent" : "border-[#26263a] bg-[#14141f] hover:border-[#3a3a55]"
            }`}
            style={selected ? { borderColor: accent, backgroundColor: `${accent}0d` } : undefined}
          >
            <div className="flex gap-1.5">
              {t.swatch.map((c) => (
                <span
                  key={c}
                  className="h-6 w-6 rounded-md border border-white/10"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="mt-3 text-sm font-bold text-white">
              {t.name}
              {selected && (
                <span className="ml-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: accent }}>
                  Active
                </span>
              )}
            </div>
            <div className="mt-0.5 text-xs text-[#9a9ab0]">{t.blurb}</div>
          </button>
        );
      })}
    </div>
  );
}
