"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { story } from "@/config/story";
import { audio } from "@/game/systems/audio/AudioManager";
import { useT } from "@/hooks/useT";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useUIStore } from "@/store/uiStore";
import { Typewriter } from "@/components/ui/Typewriter";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { DialogueLine } from "@/types/story";

interface LineViewProps {
  line: DialogueLine;
  index: number;
  total: number;
  onAdvance: () => void;
  onSkipAll: () => void;
}

/** One dialogue line. Re-keyed per line so its reveal state resets naturally. */
function LineView({ line, index, total, onAdvance, onSkipAll }: LineViewProps) {
  const t = useT();
  const { isTouch } = useIsMobile();
  const [typed, setTyped] = useState(false);
  const [instant, setInstant] = useState(false);
  const isLast = index >= total - 1;
  const isSender = line.speaker === story.senderName;

  const next = useCallback(() => {
    if (!typed) {
      setInstant(true);
      return;
    }
    audio.sfx("ui-click", { volume: 0.5 });
    onAdvance();
  }, [typed, onAdvance]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter" || e.code === "KeyE") {
        e.preventDefault();
        next();
      }
      if (e.code === "Escape") {
        e.preventDefault();
        onSkipAll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, onSkipAll]);

  return (
    <button type="button" onClick={next} className="glass relative w-full max-w-3xl cursor-pointer rounded-3xl px-5 py-5 text-left focus-ring md:px-8 md:py-6" aria-live="polite">
      {line.speaker && (
        <span
          className={
            "absolute -top-4 left-6 rounded-full px-4 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-midnight-900 " +
            (isSender ? "bg-gradient-to-r from-rose-300 to-gold-300" : "bg-lavender-300")
          }
        >
          {line.speaker}
        </span>
      )}
      <Typewriter
        text={line.text}
        speed={34}
        instant={instant}
        onDone={() => setTyped(true)}
        className={"font-display text-xl leading-relaxed text-ink md:text-2xl " + (!line.speaker ? "italic text-lavender-100" : "")}
      />
      <div className="mt-4 flex items-center justify-between text-[0.68rem] uppercase tracking-[0.25em] text-ink-faint">
        <span className="flex items-center gap-2">
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} className={"h-1 w-4 rounded-full " + (i <= index ? "bg-rose-300" : "bg-white/15")} />
          ))}
        </span>
        <span className="flex items-center gap-3">
          {total > 1 && !isLast && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-3 text-[0.65rem]"
              onClick={(e) => {
                e.stopPropagation();
                onSkipAll();
              }}
            >
              {t("skip")}
            </Button>
          )}
          <span className="flex items-center gap-1.5">
            {typed ? (isTouch ? t("tapToContinue") : t("pressToContinue")) : "…"}
            <Icon name={isLast ? "check" : "arrow-right"} size={12} className="animate-pulse" />
          </span>
        </span>
      </div>
    </button>
  );
}

/**
 * Visual-novel style dialogue: speaker label, typewriter text, click/tap or
 * Space/Enter to reveal the whole line first and then advance.
 */
export function DialogueBox() {
  const dialogue = useUIStore((s) => s.dialogue);
  const index = useUIStore((s) => s.dialogueIndex);
  const advance = useUIStore((s) => s.advanceDialogue);
  const skipAll = useUIStore((s) => s.skipDialogue);
  const overlay = useUIStore((s) => s.overlay);
  const line = dialogue?.lines[index];

  return (
    <AnimatePresence>
      {dialogue && line && !overlay && (
        <motion.div
          key="dialogue"
          className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(1rem,var(--safe-bottom))] md:px-8 md:pb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <LineView key={`${index}-${line.text}`} line={line} index={index} total={dialogue.lines.length} onAdvance={advance} onSkipAll={skipAll} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
