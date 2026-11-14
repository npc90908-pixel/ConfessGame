"use client";

import { motion } from "framer-motion";
import { story } from "@/config/story";
import { CHAPTER_ORDER } from "@/game/scenes/registry";
import { ITEMS } from "@/game/systems/items";
import { useT } from "@/hooks/useT";
import { useProgressStore } from "@/store/progressStore";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { formatDuration } from "@/lib/utils";

/** Scene 22 — "Everything We Found": recap of the whole adventure. */
export default function SummaryOverlay() {
  const t = useT();
  const close = useUIStore((s) => s.closeOverlay);
  const inventory = useProgressStore((s) => s.inventory);
  const completedScenes = useProgressStore((s) => s.completedScenes.length);
  const playTime = useProgressStore((s) => s.stats.playTimeMs);
  const viewed = useProgressStore((s) => s.viewedMemories.length);
  const items = inventory.map((id) => ITEMS[id]).filter(Boolean);

  const stats = [
    { label: t("itemsCollected"), value: items.length },
    { label: t("memories"), value: `${viewed}/${story.memories.length}` },
    { label: t("questsCompleted"), value: completedScenes },
    { label: t("timePlayed"), value: formatDuration(playTime) },
  ];

  return (
    <motion.div
      className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-midnight-950/55 p-3 backdrop-blur-[2px] sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={story.summary.title}
    >
      <div className="glass scrollbar-elegant max-h-full w-full max-w-3xl overflow-y-auto rounded-3xl p-6 md:p-10">
        <motion.p className="text-[0.68rem] font-semibold uppercase tracking-[0.4em] text-rose-300/90" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {story.summary.subtitle}
        </motion.p>
        <motion.h2 className="mt-2 font-display text-4xl text-ink md:text-5xl" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {story.summary.title}
        </motion.h2>

        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div key={stat.label} className="glass-light rounded-2xl p-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.1 }}>
              <p className="font-display text-2xl text-gold-200">{stat.value}</p>
              <p className="mt-1 text-[0.65rem] uppercase tracking-[0.2em] text-ink-faint">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 space-y-5">
          {CHAPTER_ORDER.map((chapterId, ci) => {
            const chapter = story.chapters[chapterId];
            const chapterItems = items.filter((item) => item.chapter === chapterId);
            if (chapterItems.length === 0) return null;
            return (
              <motion.section key={chapterId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 + ci * 0.15 }}>
                <header className="flex items-center gap-3">
                  <span className="h-px w-6" style={{ background: chapter.accent }} />
                  <h3 className="font-display text-lg text-ink">{chapter.title}</h3>
                </header>
                <div className="mt-2 flex flex-wrap gap-2">
                  {chapterItems.map((item, i) => (
                    <motion.span
                      key={item.id}
                      className="flex items-center gap-2 rounded-full bg-white/5 py-1 pl-1.5 pr-3 text-xs text-ink-muted"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.9 + ci * 0.15 + i * 0.05 }}
                      title={item.description}
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ color: item.color, background: `${item.color}22` }}>
                        <Icon name={item.icon} size={13} />
                      </span>
                      {item.name}
                    </motion.span>
                  ))}
                </div>
              </motion.section>
            );
          })}
        </div>

        <motion.p className="mt-10 font-display text-xl italic text-lavender-200" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}>
          “{story.dialogue.everythingWeFound[story.dialogue.everythingWeFound.length - 1].text}”
        </motion.p>
        <div className="mt-8 flex justify-end">
          <Button variant="primary" size="lg" iconRight="arrow-right" onClick={close}>
            {t("continue")}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
