import type { Metadata } from "next";
import "./globals.css";
import StoreGate from "@/components/StoreGate";
import Toaster from "@/components/Toaster";

export const metadata: Metadata = {
  title: "CoachOS — FORGE with Alex",
  description: "All-in-one coaching platform MVP: content pipeline, AI twin, gamified member portal.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <StoreGate>{children}</StoreGate>
        <Toaster />
      </body>
    </html>
  );
}
