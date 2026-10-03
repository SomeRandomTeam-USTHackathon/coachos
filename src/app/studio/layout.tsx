import AppHeader from "@/components/AppHeader";
import StudioGate from "@/components/StudioGate";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <AppHeader variant="studio" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <StudioGate>{children}</StudioGate>
      </main>
    </div>
  );
}
