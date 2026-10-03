import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// S3-style object storage with a local-disk driver. Swap these two functions
// for a real S3 client (and the delivery route for a CDN) without touching callers.
const MEDIA_DIR = path.join(process.cwd(), "data", "media");

let ffmpegPath: string | null | undefined;

export function detectFfmpeg(): string | null {
  if (ffmpegPath !== undefined) return ffmpegPath;
  try {
    ffmpegPath = execFileSync("which", ["ffmpeg"], { encoding: "utf8" }).trim() || null;
  } catch {
    ffmpegPath = null;
  }
  return ffmpegPath;
}

export function putObject(id: string, buf: Buffer): void {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
  fs.writeFileSync(path.join(MEDIA_DIR, id), buf);
}

export function getObject(id: string): Buffer | null {
  const p = path.join(MEDIA_DIR, id);
  return fs.existsSync(p) ? fs.readFileSync(p) : null;
}

export function deleteObject(id: string): void {
  fs.rmSync(path.join(MEDIA_DIR, id), { force: true });
}

// Transcodes to AAC (.m4a) when ffmpeg is available; otherwise stores raw.
export function processAudio(id: string, raw: Buffer): { buf: Buffer; mime: string; processed: boolean } {
  const ffmpeg = detectFfmpeg();
  if (!ffmpeg) return { buf: raw, mime: "application/octet-stream", processed: false };
  const src = path.join(MEDIA_DIR, `${id}.src`);
  const out = path.join(MEDIA_DIR, `${id}.m4a`);
  try {
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
    fs.writeFileSync(src, raw);
    execFileSync(ffmpeg, ["-y", "-i", src, "-c:a", "aac", "-b:a", "64k", out], { stdio: "pipe" });
    const buf = fs.readFileSync(out);
    return { buf, mime: "audio/mp4", processed: true };
  } catch {
    return { buf: raw, mime: "application/octet-stream", processed: false };
  } finally {
    fs.rmSync(src, { force: true });
    fs.rmSync(out, { force: true });
  }
}
