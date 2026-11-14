"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import { story } from "@/config/story";
import { useT } from "@/hooks/useT";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/Button";
import type { ChapterId } from "@/types/story";

/** Full-screen chapter title card. Auto-dismisses; tap/click/Enter to skip. */
export default function ChapterIntro({ chapterId }: { chapterId: ChapterId }) {
  const t = useT();
  const reduced = useReducedMotion();
  const close = useUIStore((s) => s.closeOverlay);
  const chapter = story.chapters[chapterId];

  useEffect(() => {
    const timer = window.setTimeout(close, (reduced ? 3500 : 6500) / story.animationSpeed);
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Enter" || e.code === "Space") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [close, reduced]);

  return (
    <motion.div
      className="pointer-events-auto absolute inset-0 z-40 flex cursor-pointer flex-col items-center justify-center px-6 text-center"
      style={{ background: `radial-gradient(ellipse at center, ${chapter.accent}26 0%, rgba(6,4,15,0.92) 65%)` }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 1 } }}
      onClick={close}
    >
      <motion.p
        className="text-[0.75rem] font-semibold uppercase tracking-[0.5em]"
        style={{ color: chapter.accent }}
        initial={{ opacity: 0, letterSpacing: "1em" }}
        animate={{ opacity: 1, letterSpacing: "0.5em" }}
        transition={{ duration: 1.4, ease: "easeOut" }}
      >
        {t("chapter")} {String(chapter.number).padStart(2, "0")}
      </motion.p>
      <motion.h2
        className="mt-4 font-display text-[clamp(2.5rem,8vw,5.5rem)] leading-none text-ink"
        initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ delay: 0.5, duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {chapter.title}
      </motion.h2>
      <motion.p className="mt-3 font-display text-xl italic text-lavender-200 md:text-2xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3, duration: 1 }}>
        {chapter.subtitle}
      </motion.p>
      <motion.div className="mt-8 h-px w-24" style={{ background: chapter.accent }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.6, duration: 1 }} />
      <motion.p className="mt-6 max-w-md text-sm leading-relaxed text-ink-muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2, duration: 1 }}>
        {chapter.intro}
      </motion.p>
      <motion.div className="mt-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.6 }}>
        <Button variant="ghost" size="sm" iconRight="arrow-right" onClick={close}>
          {t("continue")}
        </Button>
      </motion.div>
    </motion.div>
  );
}
