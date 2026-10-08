import type { SessionListEntry } from "./desktop";
export enum SessionGroup { Today = "오늘", Yesterday = "어제", Week = "지난 7일", Month = "지난 30일", Older = "이전" }
export const GROUPS = Object.values(SessionGroup);
export function sessionDate(session: SessionListEntry) { return new Date(session.lastTimestamp || session.createdAt); }
export function sessionGroup(date: Date, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const time = date.getTime();
  if (time >= start) return SessionGroup.Today;
  if (time >= start - 86400000) return SessionGroup.Yesterday;
  if (now.getTime() - time <= 7 * 86400000) return SessionGroup.Week;
  if (now.getTime() - time <= 30 * 86400000) return SessionGroup.Month;
  return SessionGroup.Older;
}
export function relativeTime(date: Date, now = Date.now()) {
  const minutes = Math.floor((now - date.getTime()) / 60000);
  for (const [duration, label] of [[525600, "년"], [43200, "개월"], [1440, "일"], [60, "시간"], [1, "분"]] as const) {
    if (minutes >= duration) return `${Math.floor(minutes / duration)}${label}`;
  }
  return "방금";
}
export function searchSessions(sessions: SessionListEntry[], query: string) {
  if (!query.trim()) return sessions;
  let matches: (text: string) => boolean;
  try { const pattern = new RegExp(query.trim(), "i"); matches = text => pattern.test(text); }
  catch { matches = text => text.toLowerCase().includes(query.trim().toLowerCase()); }
  return sessions.filter(row => matches(row.title || "") || matches(row.sessionId) || matches(row.sessionDir || ""));
}
export function sessionOrigin(directory: string, root: string) {
  const normalize = (value: string) => value.replace(/\\/g, "/").replace(/\/$/, "");
  const path = normalize(directory), anchor = normalize(root);
  if (path === anchor) return path.split("/").pop() || path;
  return path.startsWith(anchor + "/") ? path.slice(anchor.length + 1) : directory;
}
export function uniqueSessions(rows: SessionListEntry[]) {
  return Array.from(new Map(rows.filter(row => !row.isSidechain).map(row => [row.sessionId, row])).values())
    .sort((a, b) => (sessionDate(b).getTime() || 0) - (sessionDate(a).getTime() || 0));
}
