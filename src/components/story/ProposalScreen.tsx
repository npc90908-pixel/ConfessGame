"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { story } from "@/config/story";
import { game } from "@/game/engine/GameManager";
import { audio } from "@/game/systems/audio/AudioManager";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

/**
 * Scene 24 — The Question. Both answers are real, equally reachable buttons.
 * Nothing is pre-selected, nothing auto-submits, and nothing nudges toward YES.
 */
export default function ProposalScreen() {
  const reduced = useReducedMotion();
  const [busy, setBusy] = useState<"yes" | "not-yet" | null>(null);
  const words = story.proposal.question.split(" ");

  const choose = async (answer: "yes" | "not-yet") => {
    if (busy) return;
    setBusy(answer);
    audio.sfx(answer === "yes" ? "sparkle" : "ui-click", { volume: 0.9 });
    await game.answer(answer);
  };

  return (
    <motion.div
      className="pointer-events-auto absolute inset-0 z-40 flex flex-col items-center justify-end px-6 pb-[max(2rem,var(--safe-bottom))] text-center md:justify-center md:pb-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 1 } }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposal-question"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(6,4,15,0.7)_100%)]" />
      <div className="relative max-w-3xl md:translate-y-[18vh]">
        <motion.p
          className="text-[0.72rem] font-semibold uppercase tracking-[0.5em] text-rose-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 1.2 }}
        >
          {story.recipientName},
        </motion.p>
        <h2 id="proposal-question" className="mt-4 font-display text-[clamp(2.2rem,7.5vw,5.5rem)] leading-[1.02] text-ink">
          {words.map((word, i) => (
            <motion.span
              key={i}
              className="inline-block whitespace-pre"
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 1 + i * (reduced ? 0.05 : 0.22), duration: 1, ease: [0.22, 1, 0.36, 1] }}
            >
              {i === words.length - 1 ? <span className="text-gradient-rose">{word}</span> : word}
              {i < words.length - 1 ? " " : ""}
            </motion.span>
          ))}
        </h2>
        <motion.p
          className="mx-auto mt-6 max-w-xl font-display text-lg italic text-lavender-200 md:text-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 + words.length * 0.22 + 0.4, duration: 1.4 }}
        >
          {story.proposal.supportingText}
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 + words.length * 0.22 + 1.4, duration: 1 }}
        >
          <button
            type="button"
            onClick={() => choose("yes")}
            disabled={busy !== null}
            className={cn(
              "group relative min-w-56 rounded-full bg-gradient-to-r from-rose-500 via-rose-400 to-gold-300 px-10 py-5 font-display text-2xl text-white shadow-glow-rose transition-transform focus-ring",
              "hover:scale-[1.04] active:scale-[0.98] disabled:opacity-70",
            )}
          >
            <span className="absolute inset-0 rounded-full bg-white/20 opacity-0 blur-xl transition-opacity group-hover:opacity-100 motion-safe-only" />
            <span className="relative">{story.proposal.yesLabel}</span>
          </button>
          <button
            type="button"
            onClick={() => choose("not-yet")}
            disabled={busy !== null}
            className={cn(
              "min-w-56 rounded-full border border-white/25 bg-white/10 px-10 py-5 font-display text-2xl text-ink backdrop-blur-md transition-all focus-ring",
              "hover:scale-[1.04] hover:bg-white/20 active:scale-[0.98] disabled:opacity-70",
            )}
          >
            {story.proposal.notYetLabel}
          </button>
        </motion.div>
        <motion.p className="mt-6 text-xs text-ink-faint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 + words.length * 0.22 + 2.4 }}>
          Apa pun jawabannya, tidak ada yang salah. · Whatever you choose is okay.
        </motion.p>
      </div>
    </motion.div>
  );
}
