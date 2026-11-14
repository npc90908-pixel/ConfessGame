"use client";

import { useState } from "react";
import { story } from "@/config/story";
import { game } from "@/game/engine/GameManager";
import { SCENES, TOTAL_SCENES } from "@/game/scenes/registry";
import { useT } from "@/hooks/useT";
import { selectProgressPercent, useProgressStore } from "@/store/progressStore";
import { useUIStore } from "@/store/uiStore";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/Controls";
import { formatDuration } from "@/lib/utils";

export default function PauseMenu() {
  const t = useT();
  const open = useUIStore((s) => s.pushOverlay);
  const sceneId = useProgressStore((s) => s.sceneId);
  const percent = useProgressStore(selectProgressPercent);
  const playTime = useProgressStore((s) => s.stats.playTimeMs);
  const inventory = useProgressStore((s) => s.inventory.length);
  const [confirm, setConfirm] = useState<"restart" | "menu" | null>(null);
  const scene = SCENES[sceneId];
  const chapter = story.chapters[scene.chapter];

  return (
    <Modal onClose={() => game.resume()} eyebrow={t("paused")} title={story.title} size="sm" labelledBy="pause-title">
      <div className="glass-light mb-6 rounded-2xl p-4">
        <p className="text-[0.65rem] uppercase tracking-[0.3em] text-ink-faint">
          {t("chapter")} {chapter.number} · {t("scene")} {scene.number}/{TOTAL_SCENES}
        </p>
        <p className="mt-1 font-display text-xl text-ink">{chapter.title}</p>
        <ProgressBar value={percent} className="mt-3" />
        <div className="mt-3 flex justify-between text-xs text-ink-muted">
          <span>{percent}%</span>
          <span>
            {inventory} {t("itemsCollected").toLowerCase()} · {formatDuration(playTime)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button variant="primary" size="lg" icon="play" onClick={() => game.resume()}>
          {t("resume")}
        </Button>
        <Button variant="secondary" icon="bag" onClick={() => open({ type: "inventory" })}>
          {t("inventory")}
        </Button>
        <Button variant="secondary" icon="photo" onClick={() => open({ type: "gallery" })}>
          {t("memories")}
        </Button>
        <Button variant="secondary" icon="settings" onClick={() => open({ type: "settings", from: "pause" })}>
          {t("settings")}
        </Button>
        {confirm === "restart" ? (
          <div className="flex gap-2">
            <Button variant="danger" className="flex-1" onClick={() => void game.restartChapter()}>
              {t("yes")} — {t("restartChapter")}
            </Button>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              {t("cancel")}
            </Button>
          </div>
        ) : (
          <Button variant="ghost" icon="replay" onClick={() => setConfirm("restart")}>
            {t("restartChapter")}
          </Button>
        )}
        {confirm === "menu" ? (
          <div className="flex gap-2">
            <Button variant="danger" className="flex-1" onClick={() => void game.returnToTitle()}>
              {t("yes")} — {t("mainMenu")}
            </Button>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              {t("cancel")}
            </Button>
          </div>
        ) : (
          <Button variant="ghost" icon="arrow-left" onClick={() => setConfirm("menu")}>
            {t("mainMenu")}
          </Button>
        )}
      </div>
      <p className="mt-5 text-center text-[0.65rem] text-ink-faint">Progress tersimpan otomatis · saved automatically</p>
    </Modal>
  );
}
