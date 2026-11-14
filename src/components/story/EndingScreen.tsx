"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { story } from "@/config/story";
import { game } from "@/game/engine/GameManager";
import { useT } from "@/hooks/useT";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/Button";
import { createRng } from "@/lib/math";
import type { Answer } from "@/types/game";

const PETAL_COLORS = ["#ff8fb8", "#ffb7d5", "#f3d08a", "#b9a7ff", "#ffffff"];

function PetalRain() {
  const petals = useMemo(() => {
    const rng = createRng(1234);
    return Array.from({ length: 28 }, (_, i) => ({
      id: i,
      x: rng.range(0, 100),
      delay: rng.range(0, 8),
      duration: rng.range(9, 16),
      size: rng.range(8, 16),
      color: PETAL_COLORS[i % PETAL_COLORS.length],
      drift: rng.range(-40, 40),
      rotate: rng.range(0, 360),
    }));
  }, []);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {petals.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-[-5%] block rounded-[100%_0_100%_0]"
          style={{ left: `${p.x}%`, width: p.size, height: p.size * 0.7, background: p.color, opacity: 0.85 }}
          initial={{ y: "-10vh", x: 0, rotate: p.rotate }}
          animate={{ y: "110vh", x: [0, p.drift, -p.drift, 0], rotate: p.rotate + 540 }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
}

/** Scene 25 — A New Beginning. Two gentle endings, one shared structure. */
export default function EndingScreen({ answer }: { answer: Answer }) {
  const t = useT();
  const reduced = useReducedMotion();
  const open = useUIStore((s) => s.pushOverlay);
  const [stage, setStage] = useState<"headline" | "letter" | "menu">("headline");
  const yes = answer === "yes";
  const ending = yes ? story.endings.yes : story.endings.notYet;
  const letter = yes ? story.letters.yesClosing : story.letters.notYetClosing;

  useEffect(() => {
    if (stage !== "headline") return;
    const timer = window.setTimeout(() => setStage("letter"), (reduced ? 2500 : 6500) / story.animationSpeed);
    return () => window.clearTimeout(timer);
  }, [stage, reduced]);

  return (
    <motion.div
      className="pointer-events-auto absolute inset-0 z-40 flex flex-col items-center justify-center px-6 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={ending.headline}
    >
      {yes && !reduced && <PetalRain />}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(6,4,15,0.7)_100%)]" />

      {stage === "headline" && (
        <motion.div key="headline" className="relative max-w-3xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.p
            className="text-[0.72rem] font-semibold uppercase tracking-[0.5em] text-rose-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
          >
            {yes ? "Bab baru · a new chapter" : "Tidak apa-apa · it's okay"}
          </motion.p>
          <motion.h2
            className="mt-4 font-display text-[clamp(2.2rem,7vw,5.5rem)] leading-[1.02] text-ink"
            initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 1, duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {yes ? <span className="text-shimmer">{ending.headline}</span> : ending.headline}
          </motion.h2>
          <motion.p className="mx-auto mt-6 max-w-xl font-display text-lg italic text-lavender-200 md:text-2xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4, duration: 1.4 }}>
            {ending.message}
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.4 }} className="mt-10">
            <Button variant="ghost" size="sm" iconRight="arrow-right" onClick={() => setStage("letter")}>
              {t("continue")}
            </Button>
          </motion.div>
        </motion.div>
      )}

      {stage === "letter" && (
        <motion.div
          key="letter"
          className="paper selectable relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl"
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="scrollbar-elegant min-h-0 flex-1 overflow-y-auto px-7 pb-6 pt-9 text-left md:px-12 md:pt-12">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-rose-600/80">{letter.title}</p>
            {letter.greeting && <p className="mt-4 font-script text-3xl text-[#5a3a5f] md:text-4xl">{letter.greeting}</p>}
            <div className="mt-5 space-y-5 font-display text-[1.15rem] leading-relaxed text-[#3a2a3f] md:text-[1.3rem]">
              {letter.paragraphs.map((paragraph, i) => (
                <motion.p key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * (reduced ? 0.1 : 1.1), duration: 1 }}>
                  {paragraph}
                </motion.p>
              ))}
            </div>
            {letter.signature && (
              <motion.p
                className="mt-8 whitespace-pre-line text-right font-script text-3xl text-[#5a3a5f] md:text-4xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 + letter.paragraphs.length * (reduced ? 0.1 : 1.1), duration: 1 }}
              >
                {letter.signature}
              </motion.p>
            )}
          </div>
          <div className="flex justify-end border-t border-black/10 px-6 py-4 md:px-10">
            <Button variant="rose" iconRight="arrow-right" onClick={() => setStage("menu")}>
              {t("continue")}
            </Button>
          </div>
        </motion.div>
      )}

      {stage === "menu" && (
        <motion.div key="menu" className="glass relative w-full max-w-md rounded-3xl p-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.4em] text-rose-300/90">{story.title}</p>
          <h3 className="mt-2 font-display text-3xl text-ink">{yes ? "Terima kasih, " + story.recipientName + "." : "Pintunya tetap terbuka."}</h3>
          <p className="mt-3 text-sm text-ink-muted">{yes ? story.tagline : "Progress kamu tersimpan. Kamu bisa kembali kapan saja — tanpa harus menjawab apa pun."}</p>
          <div className="mt-6 flex flex-col gap-2">
            <Button variant="secondary" icon="letter" onClick={() => open({ type: "letter", letterId: "from-me", closable: true })}>
              {t("readLetterAgain")}
            </Button>
            <Button variant="secondary" icon="photo" onClick={() => open({ type: "gallery" })}>
              {t("exploreMemories")}
            </Button>
            {!yes && (
              <Button variant="secondary" icon="heart" onClick={() => void game.enterScene("the-question")}>
                Kembali ke pertanyaan · back to the question
              </Button>
            )}
            <Button variant="primary" icon="replay" onClick={() => void game.returnToTitle()}>
              {yes ? t("replayJourney") : t("mainMenu")}
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
