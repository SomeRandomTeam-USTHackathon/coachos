"use client";

import { useStore } from "@/lib/store";
import CreatorWizard from "./CreatorWizard";

export default function StudioGate({ children }: { children: React.ReactNode }) {
  const creator = useStore((s) => s.creator);
  if (!creator.onboardingDone) return <CreatorWizard />;
  return <>{children}</>;
}
