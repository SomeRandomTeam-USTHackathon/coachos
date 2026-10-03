"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

export default function StoreGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const hydrate = useStore((s) => s.hydrate);

  useEffect(() => {
    let cancelled = false;
    hydrate()
      .then(() => !cancelled && setStatus("ready"))
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-[#9a9ab0]">Cannot reach the CoachOS backend.</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
        >
          Retry
        </button>
      </div>
    );
  }

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-xs font-semibold tracking-[0.3em] text-[#9a9ab0]">
          LOADING COACHOS
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
