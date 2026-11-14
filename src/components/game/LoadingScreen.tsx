"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useProgress } from "@react-three/drei";
import { BOOT_PRELOAD } from "@/config/assets";
import { story } from "@/config/story";
import { game } from "@/game/engine/GameManager";
import { useT } from "@/hooks/useT";
import { preferredAudioUrl, preloadUrls } from "@/lib/preload";
import { pick } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { ProgressBar } from "@/components/ui/Controls";

const MIN_DURATION = 1800;
const MAX_WAIT = 20000;

/**
 * Initial loading screen. Warms boot assets, mounts the first environment
 * behind the scenes and hands over to the title screen once everything is
 * ready (or after a safety timeout so nobody is ever stuck).
 */
export function LoadingScreen() {
  const t = useT();
  const { progress: threeProgress } = useProgress();
  const readyEnvironment = useUIStore((s) => s.readyEnvironment);
  const [fetched, setFetched] = useState(0);
  const [fetchDone, setFetchDone] = useState(false);
  const [elapsedOk, setElapsedOk] = useState(false);
  const [forced, setForced] = useState(false);
  const booted = useRef(false);
  const [message] = useState(() => pick(story.romanticMessages));

  useEffect(() => {
    useUIStore.getState().setActiveEnvironment("sky-island");
    const urls = [...BOOT_PRELOAD.textures, ...BOOT_PRELOAD.audio.map(preferredAudioUrl)];
    void preloadUrls(urls, setFetched).then(() => setFetchDone(true));
    const minTimer = window.setTimeout(() => setElapsedOk(true), MIN_DURATION);
    const maxTimer = window.setTimeout(() => setForced(true), MAX_WAIT);
    return () => {
      window.clearTimeout(minTimer);
      window.clearTimeout(maxTimer);
    };
  }, []);

  const envReady = readyEnvironment === "sky-island";
  const combined = Math.round(fetched * 35 + (envReady ? 65 : Math.min(threeProgress, 95) * 0.65));

  useEffect(() => {
    if (booted.current) return;
    if ((fetchDone && envReady && elapsedOk) || forced) {
      booted.current = true;
      game.boot();
    }
  }, [fetchDone, envReady, elapsedOk, forced]);

  return (
    <motion.div
      className="pointer-events-auto absolute inset-0 z-[60] flex flex-col items-center justify-center bg-midnight-950 px-8 text-center"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 1.2, ease: "easeInOut" } }}
      aria-live="polite"
    >
      <motion.div
        className="relative mb-10 h-24 w-24"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute inset-0 rounded-full bg-rose-500/10 blur-xl animate-pulse-glow motion-safe-only" />
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          <defs>
            <linearGradient id="loader-grad" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#f3d08a" />
              <stop offset="50%" stopColor="#ff8fb8" />
              <stop offset="100%" stopColor="#b9a7ff" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
          <motion.circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="url(#loader-grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 44}
            animate={{ strokeDashoffset: 2 * Math.PI * 44 * (1 - combined / 100) }}
            transition={{ duration: 0.5 }}
            transform="rotate(-90 50 50)"
          />
          <path
            d="M50 72 C 38 62, 26 54, 26 42 C 26 34, 32 29, 39 29 C 44 29, 48 32, 50 36 C 52 32, 56 29, 61 29 C 68 29, 74 34, 74 42 C 74 54, 62 62, 50 72 Z"
            fill="url(#loader-grad)"
            opacity="0.9"
          />
        </svg>
      </motion.div>
      <p className="font-display text-3xl italic text-lavender-200 md:text-4xl">{story.title}</p>
      <p className="mt-4 max-w-xs text-sm text-ink-muted">{message}</p>
      <div className="mt-10 w-56">
        <ProgressBar value={combined} />
        <p className="mt-3 text-[0.68rem] uppercase tracking-[0.35em] text-ink-faint">
          {t("loading")} · {combined}%
        </p>
      </div>
    </motion.div>
  );
}
