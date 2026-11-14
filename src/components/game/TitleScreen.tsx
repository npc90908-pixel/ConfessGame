"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { story } from "@/config/story";
import { game } from "@/game/engine/GameManager";
import { useT } from "@/hooks/useT";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { selectHasSave, selectProgressPercent, useProgressStore } from "@/store/progressStore";
import { useUIStore } from "@/store/uiStore";
import { SCENES } from "@/game/scenes/registry";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { createRng } from "@/lib/math";

const titleWords = story.title.split(" ");

/**
 * Scene 01 — The Awakening. Black screen → ambient particles → starfield
 * reveal (the 3D island fades in behind) → title → START JOURNEY.
 */
export function TitleScreen() {
  const t = useT();
  const reduced = useReducedMotion();
  const hasSave = useProgressStore(selectHasSave);
  const percent = useProgressStore(selectProgressPercent);
  const checkpoint = useProgressStore((s) => s.checkpointSceneId);
  const answer = useProgressStore((s) => s.answer);
  const viewedMemories = useProgressStore((s) => s.viewedMemories.length);
  const [revealed, setRevealed] = useState(reduced);
  const [busy, setBusy] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setRevealed(true), reduced ? 0 : 2600);
    return () => window.clearTimeout(timer);
  }, [reduced]);

  const particles = useMemo(() => {
    const rng = createRng(42);
    return Array.from({ length: 36 }, (_, i) => ({
      id: i,
      x: rng.range(2, 98),
      y: rng.range(5, 95),
      size: rng.range(2, 5),
      delay: rng.range(0, 6),
      duration: rng.range(6, 14),
    }));
  }, []);

  const start = async () => {
    if (busy) return;
    setBusy(true);
    await game.startNewJourney();
    setBusy(false);
  };
  const cont = async () => {
    if (busy) return;
    setBusy(true);
    await game.continueJourney();
    setBusy(false);
  };

  const chapterLabel = hasSave ? story.chapters[SCENES[checkpoint].chapter].title : null;

  return (
    <motion.div
      className="pointer-events-auto absolute inset-0 z-20 flex flex-col"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8 } }}
    >
      {/* Black → starfield reveal */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-midnight-950"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: reduced ? 0.3 : 4.5, ease: "easeInOut", delay: reduced ? 0 : 0.6 }}
      />
      {/* Subtle ambient particles */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {particles.map((p) => (
          <motion.span
            key={p.id}
            className="absolute rounded-full bg-lavender-200"
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, filter: "blur(0.5px)" }}
            initial={{ opacity: 0 }}
            animate={reduced ? { opacity: 0.4 } : { opacity: [0, 0.7, 0], y: [0, -40, -80] }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>
      {/* Gradient legibility layer */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-midnight-950/90 via-midnight-950/40 to-transparent" />

      <div className="relative flex flex-1 flex-col items-center justify-end px-6 pb-[max(2.5rem,var(--safe-bottom))] pt-16 text-center md:justify-center md:pb-10">
        <motion.p
          className="mb-4 text-[0.7rem] font-semibold uppercase tracking-[0.45em] text-rose-300/90"
          initial={{ opacity: 0, y: 10 }}
          animate={revealed ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.2 }}
        >
          {story.senderName} × {story.recipientName}
        </motion.p>
        <h1 className="font-display text-[clamp(2.6rem,9vw,6.5rem)] leading-[0.95] text-ink" aria-label={story.title}>
          {titleWords.map((word, i) => (
            <motion.span
              key={`${word}-${i}`}
              className="inline-block whitespace-pre"
              initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
              animate={revealed ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
              transition={{ duration: 1.3, delay: reduced ? 0 : 0.18 * i, ease: [0.22, 1, 0.36, 1] }}
            >
              {i === titleWords.length - 1 ? <span className="text-shimmer italic">{word}</span> : word}
              {i < titleWords.length - 1 ? " " : ""}
            </motion.span>
          ))}
        </h1>
        <motion.p
          className="mt-5 max-w-xl font-display text-lg italic text-lavender-200/90 md:text-2xl"
          initial={{ opacity: 0 }}
          animate={revealed ? { opacity: 1 } : {}}
          transition={{ duration: 1.5, delay: reduced ? 0 : 1 }}
        >
          “{story.tagline}”
        </motion.p>

        <motion.div
          className="mt-10 flex w-full max-w-sm flex-col items-stretch gap-3 md:mt-12 md:max-w-none md:flex-row md:items-center md:justify-center"
          initial={{ opacity: 0, y: 16 }}
          animate={revealed ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, delay: reduced ? 0 : 1.6 }}
        >
          {hasSave ? (
            <>
              <Button variant="primary" size="xl" icon="play" onClick={cont} disabled={busy} className="md:min-w-64">
                {t("continueJourney")}
              </Button>
              {!confirmNew ? (
                <Button variant="secondary" size="lg" icon="replay" onClick={() => setConfirmNew(true)} disabled={busy}>
                  {t("newJourney")}
                </Button>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Button variant="danger" size="md" onClick={start} disabled={busy}>
                    {t("yes")} — {t("newJourney")}
                  </Button>
                  <Button variant="ghost" size="md" onClick={() => setConfirmNew(false)}>
                    {t("cancel")}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Button variant="primary" size="xl" icon="sparkles" glow onClick={start} disabled={busy} className="md:min-w-72">
              {t("startJourney")}
            </Button>
          )}
          <Button
            variant="ghost"
            size="lg"
            icon="settings"
            onClick={() => useUIStore.getState().openOverlay({ type: "settings", from: "title" })}
          >
            {t("settings")}
          </Button>
          {viewedMemories > 0 && (
            <Button variant="ghost" size="lg" icon="photo" onClick={() => useUIStore.getState().openOverlay({ type: "gallery" })}>
              {t("memories")}
            </Button>
          )}
        </motion.div>

        {hasSave && chapterLabel && (
          <motion.p
            className="mt-5 text-xs text-ink-faint"
            initial={{ opacity: 0 }}
            animate={revealed ? { opacity: 1 } : {}}
            transition={{ delay: reduced ? 0 : 2 }}
          >
            {t("chapter")} · {chapterLabel} · {percent}%{answer ? ` · ${answer === "yes" ? "❤️" : "✨"}` : ""}
          </motion.p>
        )}

        <motion.p
          className="mt-8 flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.3em] text-ink-faint"
          initial={{ opacity: 0 }}
          animate={revealed ? { opacity: 1 } : {}}
          transition={{ delay: reduced ? 0 : 2.4, duration: 1 }}
        >
          <Icon name="volume" size={14} /> best experienced with sound
        </motion.p>
      </div>
    </motion.div>
  );
}
