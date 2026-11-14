"use client";

import { motion } from "framer-motion";
import { game } from "@/game/engine/GameManager";
import { useT } from "@/hooks/useT";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Controls";
import { Icon } from "@/components/ui/Icon";

export default function ControlsOverlay({ mode }: { mode: "walk" | "boat" }) {
  const t = useT();
  const { isTouch } = useIsMobile();
  const close = useUIStore((s) => s.closeOverlay);

  const rows =
    mode === "walk"
      ? [
          { label: t("moveHint"), keys: ["W", "A", "S", "D"], touch: t("joystickHint"), icon: "compass" as const },
          { label: t("lookHint"), keys: ["Mouse"], touch: t("swipeHint"), icon: "sparkles" as const },
          { label: t("jumpHint"), keys: ["Space"], touch: t("jumpButton"), icon: "jump" as const },
          { label: t("interactHint"), keys: ["E"], touch: t("tapHere"), icon: "hand" as const },
          { label: t("pause"), keys: ["Esc"], touch: t("pauseButton"), icon: "pause" as const },
        ]
      : [
          { label: t("steer"), keys: ["W", "A", "S", "D"], touch: t("joystickHint"), icon: "map" as const },
          { label: t("lookHint"), keys: ["Mouse"], touch: t("swipeHint"), icon: "sparkles" as const },
          { label: t("interactHint"), keys: ["E"], touch: t("tapHere"), icon: "bottle" as const },
        ];

  return (
    <motion.div
      className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-midnight-950/60 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={t("controls")}
    >
      <motion.div className="glass w-full max-w-lg rounded-3xl p-6 md:p-8" initial={{ y: 30, scale: 0.96 }} animate={{ y: 0, scale: 1 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.35em] text-rose-300/90">{t("controls")}</p>
        <h2 className="mt-1 font-display text-3xl text-ink">{mode === "walk" ? t("howToExplore") : t("howToSail")}</h2>
        <ul className="mt-6 space-y-3">
          {rows.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-4 rounded-2xl bg-white/5 px-4 py-3">
              <span className="flex items-center gap-3 text-sm text-ink">
                <Icon name={row.icon} size={18} className="text-lavender-300" />
                {row.label}
              </span>
              {isTouch ? (
                <span className="text-right text-xs text-ink-muted">{row.touch}</span>
              ) : (
                <span className="flex gap-1">
                  {row.keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex justify-end">
          <Button
            variant="primary"
            size="lg"
            iconRight="arrow-right"
            onClick={() => {
              close();
              game.resume();
            }}
          >
            {t("gotIt")}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
