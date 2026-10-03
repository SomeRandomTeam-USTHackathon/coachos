import AppHeader from "@/components/AppHeader";
import Checkout from "@/components/Checkout";
import PortalGate from "@/components/PortalGate";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <AppHeader variant="portal" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <PortalGate>{children}</PortalGate>
      </main>
      <Checkout />
    </div>
  );
}
