import type { Access } from "@/lib/types";

const STYLES: Record<Access, string> = {
  free: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  member: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  archive: "border-amber-500/40 bg-amber-500/10 text-amber-300",
};

const LABELS: Record<Access, string> = {
  free: "Free",
  member: "Members",
  archive: "Archive",
};

export default function AccessChip({ access }: { access: Access }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STYLES[access]}`}
    >
      {LABELS[access]}
    </span>
  );
}
