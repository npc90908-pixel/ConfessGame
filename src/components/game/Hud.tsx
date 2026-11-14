"use client";

import { AnimatePresence, motion } from "framer-motion";
import { story } from "@/config/story";
import { game } from "@/game/engine/GameManager";
import { triggerActiveInteraction } from "@/game/engine/interactions";
import { SCENES, TOTAL_SCENES } from "@/game/scenes/registry";
import { useQualityStore } from "@/game/systems/quality";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useT } from "@/hooks/useT";
import { useProgressStore } from "@/store/progressStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useUIStore } from "@/store/uiStore";
import { IconButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Kbd, ProgressBar } from "@/components/ui/Controls";
import { cn } from "@/lib/utils";
import { MobileControls } from "./MobileControls";

function QuestTracker() {
  const t = useT();
  const sceneId = useProgressStore((s) => s.sceneId);
  const objectiveProgress = useProgressStore((s) => s.objectiveProgress);
  const flash = useUIStore((s) => s.objectiveFlash);
  const scene = SCENES[sceneId];
  const chapter = story.chapters[scene.chapter];
  const objective = scene.objective;
  const value = objective ? Math.min(objective.total, objectiveProgress[objective.id] ?? 0) : 0;

  return (
    <motion.div
      className="glass pointer-events-auto relative w-[min(20rem,calc(100vw-7rem))] rounded-2xl px-4 py-3"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* re-keyed glow ring: restarts its one-shot animation on every objective update */}
      {flash > 0 && <span key={flash} aria-hidden className="objective-flash pointer-events-none absolute inset-0 rounded-2xl" />}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-rose-300/90">
          {t("chapter")} {String(chapter.number).padStart(2, "0")} · {t("scene")} {String(scene.number).padStart(2, "0")}/{TOTAL_SCENES}
        </p>
        <Icon name="compass" size={14} className="text-lavender-300" />
      </div>
      <p className="mt-1 truncate font-display text-lg leading-tight text-ink">{scene.title}</p>
      {objective && (
        <div className="mt-2">
          <div className="flex items-start justify-between gap-3 text-xs">
            <p className="text-ink-muted">{objective.text}</p>
            {objective.total > 1 && (
              <span className="shrink-0 tabular-nums text-gold-300">
                {value}/{objective.total}
              </span>
            )}
          </div>
          {objective.total > 1 && <ProgressBar value={(value / objective.total) * 100} tone="gold" className="mt-2" />}
        </div>
      )}
    </motion.div>
  );
}

function InteractionPrompt({ isTouch }: { isTouch: boolean }) {
  const prompt = useUIStore((s) => s.prompt);
  const t = useT();
  return (
    <AnimatePresence>
      {prompt && (
        <motion.button
          key={prompt.id}
          type="button"
          className={cn(
            "glass pointer-events-auto flex items-center gap-3 rounded-full py-2.5 pl-3 pr-5 text-sm text-ink shadow-glow-lavender focus-ring",
            isTouch && "py-3.5 pl-4 pr-6 text-base",
          )}
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          onClick={() => triggerActiveInteraction()}
        >
          {isTouch ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-lavender-400 text-white">
              <Icon name={prompt.icon ?? "hand"} size={18} />
            </span>
          ) : (
            <Kbd>E</Kbd>
          )}
          <span>
            <span className="text-ink-faint">{isTouch ? t("tapHere") : t("pressE")}</span>{" "}
            <span className="font-semibold">{prompt.label}</span>
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

function Subtitles() {
  const subtitle = useUIStore((s) => s.subtitle);
  const enabled = useSettingsStore((s) => s.subtitles);
  if (!enabled) return null;
  return (
    <AnimatePresence mode="wait">
      {subtitle && (
        <motion.p
          key={subtitle}
          className="pointer-events-none mx-auto max-w-3xl rounded-2xl bg-midnight-950/60 px-5 py-3 text-center font-display text-xl leading-snug text-ink backdrop-blur-sm md:text-2xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.4 }}
        >
          {subtitle}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function FpsBadge() {
  const show = useSettingsStore((s) => s.showPerformance);
  const fps = useQualityStore((s) => s.fps);
  const tier = useQualityStore((s) => s.autoTier);
  if (!show) return null;
  return (
    <div className="pointer-events-none rounded-lg bg-midnight-950/70 px-2 py-1 font-mono text-[0.65rem] text-gold-200">
      {fps} fps · {tier}
    </div>
  );
}

/** Gameplay HUD. Hidden during cinematics, letters and endings. */
export function Hud() {
  const t = useT();
  const hudHidden = useUIStore((s) => s.hudHidden);
  const cinematic = useUIStore((s) => s.cinematic);
  const overlay = useUIStore((s) => s.overlay);
  const dialogue = useUIStore((s) => s.dialogue);
  const muted = useSettingsStore((s) => s.muted);
  const toggleMuted = useSettingsStore((s) => s.toggleMuted);
  const { isTouch } = useIsMobile();
  const visible = !hudHidden && !cinematic && !overlay;
  const controlsVisible = visible && !dialogue;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="hud"
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* top-left: quest */}
          <div className="absolute left-[max(1rem,var(--safe-left))] top-[max(1rem,var(--safe-top))]">
            <QuestTracker />
          </div>
          {/* top-right: actions */}
          <div className="pointer-events-auto absolute right-[max(1rem,var(--safe-right))] top-[max(1rem,var(--safe-top))] flex items-center gap-2">
            <FpsBadge />
            <IconButton icon="bag" label={t("inventory")} onClick={() => game.toggleInventory()} />
            <IconButton icon={muted ? "mute" : "volume"} label={t("mute")} active={muted} onClick={() => toggleMuted()} />
            <IconButton icon="pause" label={t("paused")} onClick={() => game.pause()} />
          </div>
          {/* bottom-center: prompt + subtitles */}
          <div className="absolute inset-x-0 bottom-[max(1.25rem,var(--safe-bottom))] flex flex-col items-center gap-3 px-4" style={{ bottom: isTouch ? "calc(max(1.25rem, var(--safe-bottom)) + 9.5rem)" : undefined }}>
            <Subtitles />
            {controlsVisible && <InteractionPrompt isTouch={isTouch} />}
          </div>
          {isTouch && controlsVisible && <MobileControls />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
