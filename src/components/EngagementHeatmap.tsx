"use client";

import { useStore } from "@/lib/store";

// Activity-based heatmap (check-ins + twin chat messages per day) for the last
// 4 weeks — 7 rows × 4 week-columns, oldest week on the left.
export default function EngagementHeatmap({ days }: { days: Array<{ date: string; count: number }> }) {
  const accent = useStore((s) => s.creator.accent) ?? "#8b5cf6";
  const max = Math.max(1, ...days.map((d) => d.count));

  const cellColor = (count: number): string => {
    if (count === 0) return "#1d1d2e";
    const alpha = 0.25 + 0.75 * (count / max);
    return `${accent}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
  };

  return (
    <section className="rounded-2xl border border-[#26263a] bg-[#14141f] p-5">
      <h2 className="font-bold text-white">Engagement heatmap</h2>
      <p className="mt-1 text-sm text-[#9a9ab0]">
        Member check-ins + twin chat messages per day, last 4 weeks.
      </p>

      <div className="mt-4 flex justify-center">
        <div className="grid grid-flow-col grid-rows-7 gap-1">
          {days.map((d) => (
            <div
              key={d.date}
              title={`${d.date}: ${d.count} ${d.count === 1 ? "activity" : "activities"}`}
              className="h-5 w-5 rounded-[5px]"
              style={{ backgroundColor: cellColor(d.count) }}
            />
          ))}
        </div>
      </div>

      <div className="mt-2 flex justify-between text-[10px] text-[#5a5a72]">
        <span>4 weeks ago</span>
        <span>this week</span>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-[#5a5a72]">
        Less
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <span
            key={f}
            className="h-3 w-3 rounded-[3px]"
            style={{
              backgroundColor:
                f === 0 ? "#1d1d2e" : `${accent}${Math.round((0.25 + 0.75 * f) * 255).toString(16).padStart(2, "0")}`,
            }}
          />
        ))}
        More
      </div>
    </section>
  );
}
