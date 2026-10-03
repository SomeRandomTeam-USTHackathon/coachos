"use client";

import ChatWindow from "@/components/ChatWindow";
import { useStore } from "@/lib/store";

export default function PortalTwinPage() {
  const twin = useStore((s) => s.twin);
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-black text-white">Chat with {twin.name}</h1>
      <p className="mt-1 text-sm text-[#9a9ab0]">
        Every answer comes from the creator&apos;s published issues. Your first 5 questions each
        day earn +10 XP.
      </p>
      <div className="mt-5">
        <ChatWindow />
      </div>
    </div>
  );
}
