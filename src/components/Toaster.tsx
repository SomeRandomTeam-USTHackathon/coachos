"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

export default function Toaster() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);

  useEffect(() => {
    if (toasts.length === 0) return;
    const t = setTimeout(() => dismiss(toasts[0].id), 3500);
    return () => clearTimeout(t);
  }, [toasts, dismiss]);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto rounded-xl border border-violet-500/40 bg-[#171726] p-3 shadow-lg shadow-violet-950/50"
        >
          <div className="text-sm font-semibold text-violet-300">{t.title}</div>
          {t.detail ? <div className="mt-0.5 text-xs text-[#9a9ab0]">{t.detail}</div> : null}
        </div>
      ))}
    </div>
  );
}
