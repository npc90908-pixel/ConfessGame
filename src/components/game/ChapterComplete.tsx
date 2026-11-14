"use client";

import { motion } from "framer-motion";
import { story } from "@/config/story";
import { CHAPTER_ORDER } from "@/game/scenes/registry";
import { useT } from "@/hooks/useT";
import { useProgressStore } from "@/store/progressStore";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ITEMS } from "@/game/systems/items";
import type { ChapterId } from "@/types/story";

/** Shown when a chapter's last scene completes; continues to the next chapter. */
export default function ChapterComplete({ chapterId }: { chapterId: ChapterId }) {
  const t = useT();
  const chapter = story.chapters[chapterId];
  const inventory = useProgressStore((s) => s.inventory);
  const close = useUIStore((s) => s.closeOverlay);
  const nextId = CHAPTER_ORDER[CHAPTER_ORDER.indexOf(chapterId) + 1];
  const next = nextId ? story.chapters[nextId] : null;
  const collected = inventory.map((id) => ITEMS[id]).filter((item) => item && item.chapter === chapterId);

  return (
    <motion.div
      className="pointer-events-auto absolute inset-0 z-40 flex flex-col items-center justify-center bg-midnight-950/80 px-6 text-center backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8 } }}
    >
      <motion.span
        className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{ color: chapter.accent, background: `${chapter.accent}22`, boxShadow: `0 0 50px ${chapter.accent}66` }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <Icon name="check" size={30} />
      </motion.span>
      <motion.p className="mt-6 text-[0.72rem] font-semibold uppercase tracking-[0.45em] text-ink-faint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        {t("chapterComplete")}
      </motion.p>
      <motion.h2 className="mt-2 font-display text-4xl text-ink md:text-5xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 1 }}>
        {chapter.title}
      </motion.h2>
      <motion.p className="mt-5 max-w-lg font-display text-lg italic text-lavender-200 md:text-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 1 }}>
        “{chapter.outro}”
      </motion.p>
      {collected.length > 0 && (
        <motion.div className="mt-8 flex flex-wrap justify-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
          {collected.map((item, i) => (
            <motion.span
              key={item.id}
              className="glass flex h-10 w-10 items-center justify-center rounded-full"
              style={{ color: item.color }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.5 + i * 0.07, type: "spring", stiffness: 220, damping: 16 }}
              title={item.name}
            >
              <Icon name={item.icon} size={18} />
            </motion.span>
          ))}
        </motion.div>
      )}
      <motion.div className="mt-10" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.8 }}>
        <Button variant="primary" size="xl" iconRight="arrow-right" glow onClick={close}>
          {next ? `${t("nextChapter")}: ${next.title}` : t("continue")}
        </Button>
      </motion.div>
    </motion.div>
  );
}
