"use client";

import { useStore } from "@/lib/store";
import OnboardingWizard from "./OnboardingWizard";

export default function PortalGate({ children }: { children: React.ReactNode }) {
  const member = useStore((s) => s.member);
  if (!member.onboarded) return <OnboardingWizard />;
  return <>{children}</>;
}
