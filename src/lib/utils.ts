/** Tiny className joiner (no runtime dependency needed). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}j ${m}m`;
  if (m > 0) return `${m}m ${s}d`;
  return `${s}d`;
}

export function pick<T>(arr: readonly T[], seed?: number): T {
  if (arr.length === 0) throw new Error("pick() called with an empty array");
  const i = seed === undefined ? Math.floor(Math.random() * arr.length) : Math.abs(Math.floor(seed)) % arr.length;
  return arr[i];
}

export const isBrowser = typeof window !== "undefined";
