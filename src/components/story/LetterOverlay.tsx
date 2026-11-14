"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { story } from "@/config/story";
import { useT } from "@/hooks/useT";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useUIStore } from "@/store/uiStore";
import { audio } from "@/game/systems/audio/AudioManager";
import { Typewriter } from "@/components/ui/Typewriter";
import { Button, IconButton } from "@/components/ui/Button";
import type { Letter } from "@/types/story";

export function findLetter(id: string): Letter | undefined {
  return Object.values(story.letters).find((l) => l.id === id);
}

/**
 * Animated envelope → unfolding paper → typewriter paragraphs. Scrollable for
 * long letters. "Continue" appears once everything has been revealed (or
 * immediately when the player chooses to skip the animation).
 */
export default function LetterOverlay({ letterId, closable }: { letterId: string; closable: boolean }) {
  const t = useT();
  const reduced = useReducedMotion();
  const close = useUIStore((s) => s.closeOverlay);
  const letter = useMemo(() => findLetter(letterId), [letterId]);
  const [stage, setStage] = useState<"envelope" | "paper">(reduced ? "paper" : "envelope");
  const [revealed, setRevealed] = useState(0);
  const [instant, setInstant] = useState(reduced);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stage !== "envelope") return;
    const timer = window.setTimeout(() => {
      audio.sfx("paper", { volume: 0.7 });
      setStage("paper");
    }, 1500 / story.animationSpeed);
    return () => window.clearTimeout(timer);
  }, [stage]);

  // Keep the newest paragraph in view while it types.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [revealed]);

  if (!letter) return null;
  const total = letter.paragraphs.length;
  const done = instant || revealed >= total;

  return (
    <motion.div
      className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-midnight-950/70 p-3 backdrop-blur-sm sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={letter.title}
    >
      {stage === "envelope" ? (
        <motion.div
          key="envelope"
          className="relative h-44 w-64 md:h-56 md:w-80"
          initial={{ scale: 0.6, opacity: 0, rotate: -6 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 1.1, opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-rose-100 to-rose-200 shadow-[0_30px_80px_-20px_rgba(255,111,163,0.5)]" />
          <motion.div
            className="absolute inset-x-0 top-0 h-1/2 origin-top"
            style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)", background: "linear-gradient(180deg,#ffd0e2,#ff9fc4)" }}
            initial={{ rotateX: 0 }}
            animate={{ rotateX: 180 }}
            transition={{ delay: 0.6, duration: 0.8, ease: "easeInOut" }}
          />
          <motion.div
            className="paper absolute inset-x-6 top-4 h-32 rounded-md md:h-40"
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: -60, opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.7 }}
          />
          <div className="absolute inset-x-0 bottom-0 h-1/2 rounded-b-xl" style={{ background: "linear-gradient(0deg,#ff9fc4,#ffc2d9)", clipPath: "polygon(0 100%, 100% 100%, 100% 0, 50% 55%, 0 0)" }} />
          <motion.span
            className="absolute left-1/2 top-1/2 -ml-5 -mt-5 flex h-10 w-10 items-center justify-center rounded-full bg-rose-500 text-white shadow-glow-rose"
            initial={{ scale: 1 }}
            animate={{ scale: 0, opacity: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            ♥
          </motion.span>
        </motion.div>
      ) : (
        <motion.div
          key="paper"
          className="paper selectable relative flex max-h-full w-full max-w-2xl flex-col rounded-2xl"
          initial={{ opacity: 0, y: 40, rotate: -1.5, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {closable && (
            <IconButton
              icon="close"
              label={t("close")}
              size={38}
              onClick={close}
              className="!absolute right-3 top-3 z-10 !bg-black/10 !text-[#3a2a3f] hover:!bg-black/20"
            />
          )}
          <div ref={scroller} className="scrollbar-elegant min-h-0 flex-1 overflow-y-auto px-7 pb-6 pt-9 md:px-12 md:pb-8 md:pt-12">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-rose-600/80">{letter.title}</p>
            {letter.greeting && <p className="mt-4 font-script text-3xl text-[#5a3a5f] md:text-4xl">{letter.greeting}</p>}
            <div className="mt-5 space-y-5 font-display text-[1.15rem] leading-relaxed text-[#3a2a3f] md:text-[1.3rem]">
              {letter.paragraphs.map((paragraph, i) =>
                i <= revealed || instant ? (
                  <Typewriter
                    key={i}
                    text={paragraph}
                    speed={46}
                    instant={instant || i < revealed}
                    caret={!instant}
                    onDone={() => setRevealed((r) => (r === i ? i + 1 : r))}
                  />
                ) : null,
              )}
            </div>
            {done && letter.signature && (
              <motion.p
                className="mt-8 whitespace-pre-line text-right font-script text-3xl text-[#5a3a5f] md:text-4xl"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              >
                {letter.signature}
              </motion.p>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-black/10 px-6 py-4 md:px-10">
            <span className="text-xs text-[#7a5a7f]">
              {story.senderName} → {story.recipientName}
            </span>
            {done ? (
              <Button variant="rose" size="md" iconRight="arrow-right" onClick={close}>
                {t("continue")}
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="!text-[#7a5a7f] hover:!bg-black/5" onClick={() => setInstant(true)}>
                {t("skip")}
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
