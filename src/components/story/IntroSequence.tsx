"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { story } from "@/config/story";
import { useT } from "@/hooks/useT";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useUIStore } from "@/store/uiStore";
import { Typewriter } from "@/components/ui/Typewriter";
import { Button } from "@/components/ui/Button";

/**
 * Scene 01 — The Awakening. Narration over the drifting starfield, one line at
 * a time. Click/tap/Enter advances; Skip jumps straight to the island.
 */
export default function IntroSequence() {
  const t = useT();
  const reduced = useReducedMotion();
  const close = useUIStore((s) => s.closeOverlay);
  const lines = story.dialogue.awakening;
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(false);

  const advance = useCallback(() => {
    if (!typed) {
      setTyped(true);
      return;
    }
    if (index >= lines.length - 1) close();
    else {
      setIndex((i) => i + 1);
      setTyped(false);
    }
  }, [typed, index, lines.length, close]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance]);

  // Auto-advance a few seconds after a line is fully typed.
  useEffect(() => {
    if (!typed) return;
    const timer = window.setTimeout(advance, (reduced ? 2600 : 3800) / story.animationSpeed);
    return () => window.clearTimeout(timer);
  }, [typed, advance, reduced]);

  return (
    <motion.div
      className="pointer-events-auto absolute inset-0 z-40 flex cursor-pointer flex-col items-center justify-center px-6 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 1.4 } }}
      onClick={advance}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,4,15,0.1)_0%,rgba(6,4,15,0.75)_80%)]" />
      <div className="relative flex min-h-[8rem] max-w-3xl items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, transition: { duration: 0.5 } }}
            transition={{ duration: 0.8 }}
          >
            <Typewriter
              text={lines[index].text}
              speed={reduced ? 0 : 40}
              instant={typed}
              onDone={() => setTyped(true)}
              className="font-display text-2xl leading-relaxed text-ink md:text-4xl"
            />
          </motion.div>
        </AnimatePresence>
      </div>
      <motion.p className="relative mt-10 text-[0.68rem] uppercase tracking-[0.3em] text-ink-faint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>
        {t("tapToContinue")}
      </motion.p>
      <div className="absolute right-[max(1rem,var(--safe-right))] top-[max(1rem,var(--safe-top))]">
        <Button
          variant="ghost"
          size="sm"
          iconRight="skip"
          onClick={(e) => {
            e.stopPropagation();
            close();
          }}
        >
          {t("skip")}
        </Button>
      </div>
    </motion.div>
  );
}
