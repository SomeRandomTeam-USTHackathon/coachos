import type { Issue } from "./types";

export function canAccess(
  issue: Issue,
  subscribed: boolean,
  unlockedArchiveIds: string[]
): boolean {
  if (issue.access === "free") return true;
  if (issue.access === "member") return subscribed;
  return unlockedArchiveIds.includes(issue.id);
}
