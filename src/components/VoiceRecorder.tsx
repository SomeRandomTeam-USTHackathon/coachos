"use client";

import { useEffect, useRef, useState } from "react";

const MAX_SECONDS = 15;

type RecState = "idle" | "recording" | "ready" | "uploading" | "done" | "error";

export default function VoiceRecorder({
  onUpload,
  sendLabel = "Send voice memo",
}: {
  onUpload: (blob: Blob, duration: number) => Promise<void>;
  sendLabel?: string;
}) {
  const [state, setState] = useState<RecState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const secondsRef = useRef(0);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    []
  );

  const stop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        blobRef.current = blob;
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
        stream.getTracks().forEach((t) => t.stop());
        setState("ready");
      };
      rec.start();
      setSeconds(0);
      secondsRef.current = 0;
      setState("recording");
      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
        if (secondsRef.current >= MAX_SECONDS) stop();
      }, 1000);
    } catch {
      setState("error");
    }
  };

  const send = async () => {
    if (!blobRef.current) return;
    setState("uploading");
    try {
      await onUpload(blobRef.current, secondsRef.current || MAX_SECONDS);
      setState("done");
    } catch {
      setState("error");
    }
  };

  const reset = () => {
    blobRef.current = null;
    setUrl(null);
    setSeconds(0);
    secondsRef.current = 0;
    setState("idle");
  };

  if (state === "done") {
    return <div className="text-sm font-semibold text-emerald-300">Sent ✓</div>;
  }
  if (state === "error") {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs text-red-400">Microphone unavailable or upload failed.</span>
        <button onClick={reset} className="text-xs text-violet-300 hover:underline">
          Try again
        </button>
      </div>
    );
  }
  if (state === "idle") {
    return (
      <button
        onClick={() => void start()}
        className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
      >
        Record 15s memo
      </button>
    );
  }
  if (state === "recording") {
    return (
      <div className="flex items-center gap-3">
        <span className="flex h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
        <span className="font-mono text-sm text-white">
          {seconds}s / {MAX_SECONDS}s
        </span>
        <button
          onClick={stop}
          className="rounded-xl border border-red-500/50 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10"
        >
          Stop
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      {url && <audio src={url} controls className="h-9" />}
      <button
        onClick={() => void send()}
        disabled={state === "uploading"}
        className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
      >
        {state === "uploading" ? "Uploading…" : sendLabel}
      </button>
      {state !== "uploading" && (
        <button onClick={reset} className="text-xs text-[#9a9ab0] hover:text-white">
          Re-record
        </button>
      )}
    </div>
  );
}
