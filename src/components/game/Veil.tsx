"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useProgress } from "@react-three/drei";
import { useUIStore } from "@/store/uiStore";
import { useT } from "@/hooks/useT";
import { story } from "@/config/story";
import { useMemo } from "react";
import { pick } from "@/lib/utils";

/** Full-screen black veil used by the GameManager for fades. */
export function Veil() {
  const veil = useUIStore((s) => s.veil);
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 bg-midnight-950"
      initial={{ opacity: 1 }}
      animate={{ opacity: veil }}
      transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
      style={{ pointerEvents: veil > 0.5 ? "auto" : "none" }}
    />
  );
}

/** Environment swap screen: chapter label + loading progress. */
export function TransitionScreen() {
  const transition = useUIStore((s) => s.transition);
  const { progress, active } = useProgress();
  const t = useT();
  // A different line each time the screen appears (seeded by the swap counter).
  const environmentKey = useUIStore((s) => s.environmentKey);
  const message = useMemo(() => pick(story.romanticMessages, environmentKey * 7 + (transition.label?.length ?? 0)), [environmentKey, transition.label]);
  return (
    <AnimatePresence>
      {transition.active && (
        <motion.div
          key="transition"
          className="pointer-events-auto absolute inset-0 z-50 flex flex-col items-center justify-center bg-midnight-950 px-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8 } }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-[0.7rem] uppercase tracking-[0.4em] text-ink-faint">{t("preparingWorld")}</p>
          <h2 className="mt-3 font-display text-3xl italic text-lavender-200 md:text-4xl">{transition.label}</h2>
          <p className="mt-6 max-w-sm font-display text-lg italic text-ink-muted">“{message}”</p>
          <div className="mt-10 h-px w-48 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full bg-gradient-to-r from-rose-400 to-gold-300"
              animate={{ width: `${active ? Math.max(8, progress) : 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
