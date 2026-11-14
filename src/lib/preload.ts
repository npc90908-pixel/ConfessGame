import { Howler } from "howler";
import { audioSources } from "@/config/assets";

/**
 * Warm the HTTP cache for a list of URLs. Format-agnostic (works for audio,
 * textures and images) and reports coarse progress. Failures are ignored —
 * the real loaders will surface them if they matter.
 */
export async function preloadUrls(urls: string[], onProgress?: (fraction: number) => void): Promise<void> {
  if (typeof window === "undefined" || urls.length === 0) {
    onProgress?.(1);
    return;
  }
  let done = 0;
  const total = urls.length;
  await Promise.all(
    urls.map(async (url) => {
      try {
        await fetch(url, { cache: "force-cache" });
      } catch {
        /* offline or missing — ignore */
      } finally {
        done += 1;
        onProgress?.(done / total);
      }
    }),
  );
}

/** Pick the audio file the current browser can actually play. */
export function preferredAudioUrl(basePath: string): string {
  const [ogg, mp3] = audioSources(basePath);
  try {
    if (Howler.codecs("ogg")) return ogg;
  } catch {
    /* ignore */
  }
  return mp3;
}
