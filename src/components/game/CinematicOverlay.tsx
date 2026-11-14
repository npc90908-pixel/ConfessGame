"use client";

import { AnimatePresence, motion } from "framer-motion";
import { game } from "@/game/engine/GameManager";
import { useT } from "@/hooks/useT";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/Button";

/** Letterbox bars + skip button while a scripted camera sequence plays. */
export function CinematicOverlay() {
  const cinematic = useUIStore((s) => s.cinematic);
  const skippable = useUIStore((s) => s.cinematicSkippable);
  const overlay = useUIStore((s) => s.overlay);
  const t = useT();
  const show = cinematic && !overlay;
  return (
    <AnimatePresence>
      {show && (
        <motion.div key="cinematic" className="pointer-events-none absolute inset-0 z-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className="absolute inset-x-0 top-0 bg-midnight-950"
            initial={{ height: 0 }}
            animate={{ height: "7vh" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            className="absolute inset-x-0 bottom-0 bg-midnight-950"
            initial={{ height: 0 }}
            animate={{ height: "7vh" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
          {skippable && (
            <div className="pointer-events-auto absolute right-[max(1rem,var(--safe-right))] top-[calc(7vh+0.75rem)]">
              <Button variant="ghost" size="sm" iconRight="skip" onClick={() => game.skipCinematic()}>
                {t("skipCutscene")}
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
