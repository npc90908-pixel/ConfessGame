"use client";

import { useState } from "react";
import { game } from "@/game/engine/GameManager";
import { useQualityStore } from "@/game/systems/quality";
import { useT } from "@/hooks/useT";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSettingsStore, type MotionSetting, type QualitySetting } from "@/store/settingsStore";
import { useUIStore } from "@/store/uiStore";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Segmented, Slider, Toggle } from "@/components/ui/Controls";
import type { Language } from "@/types/story";
import { cn } from "@/lib/utils";

type Tab = "audio" | "gameplay" | "progress";

export default function SettingsPanel({ from }: { from: "pause" | "title" }) {
  const inGame = from === "pause";
  const t = useT();
  const s = useSettingsStore();
  const autoTier = useQualityStore((q) => q.autoTier);
  const { isTouch } = useIsMobile();
  const [tab, setTab] = useState<Tab>("audio");
  const [confirmReset, setConfirmReset] = useState(false);

  // Pushed from the pause menu → closing returns there automatically.
  const close = () => useUIStore.getState().closeOverlay();

  return (
    <Modal onClose={close} title={t("settings")} size="md" labelledBy="settings-title">
      <div className="mb-6 grid grid-cols-3 gap-1 rounded-2xl bg-white/5 p-1">
        {(["audio", "gameplay", "progress"] as Tab[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] transition-all focus-ring",
              tab === key ? "bg-gradient-to-r from-rose-400/80 to-lavender-400/80 text-white shadow" : "text-ink-muted hover:text-ink",
            )}
          >
            {t(key)}
          </button>
        ))}
      </div>

      {tab === "audio" && (
        <div className="space-y-6">
          <Toggle label={t("mute")} checked={s.muted} onChange={s.setMuted} />
          <Slider label={t("masterVolume")} value={s.masterVolume} onChange={s.setMasterVolume} disabled={s.muted} />
          <Slider label={t("musicVolume")} value={s.musicVolume} onChange={s.setMusicVolume} disabled={s.muted} />
          <Slider label={t("sfxVolume")} value={s.sfxVolume} onChange={s.setSfxVolume} disabled={s.muted} />
          <Toggle label={t("subtitles")} checked={s.subtitles} onChange={s.setSubtitles} />
        </div>
      )}

      {tab === "gameplay" && (
        <div className="space-y-6">
          <Segmented<QualitySetting>
            label={`${t("quality")} ${s.quality === "auto" ? `(auto → ${autoTier})` : ""}`}
            value={s.quality}
            onChange={s.setQuality}
            options={[
              { value: "auto", label: "Auto" },
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
            ]}
          />
          <Segmented<MotionSetting>
            label={t("motion")}
            value={s.motion}
            onChange={s.setMotion}
            options={[
              { value: "system", label: t("motionSystem") },
              { value: "reduced", label: t("motionReduced") },
              { value: "full", label: t("motionFull") },
            ]}
          />
          <Slider label={t("cameraSensitivity")} value={s.cameraSensitivity} min={0.25} max={2} step={0.05} onChange={s.setCameraSensitivity} format={(v) => `${v.toFixed(2)}×`} />
          <Toggle label={t("invertY")} checked={s.invertY} onChange={s.setInvertY} />
          {isTouch && (
            <Segmented<"left" | "right">
              label={t("joystickSide")}
              value={s.joystickSide}
              onChange={s.setJoystickSide}
              options={[
                { value: "left", label: t("left") },
                { value: "right", label: t("right") },
              ]}
            />
          )}
          <Segmented<Language>
            label={t("language")}
            value={s.language}
            onChange={s.setLanguage}
            options={[
              { value: "mix", label: "Mix" },
              { value: "id", label: "Indonesia" },
              { value: "en", label: "English" },
            ]}
          />
          <Toggle label={t("showPerformance")} checked={s.showPerformance} onChange={s.setShowPerformance} />
        </div>
      )}

      {tab === "progress" && (
        <div className="space-y-4">
          {inGame && <p className="text-xs text-ink-faint">Progress tersimpan otomatis setiap checkpoint.</p>}
          <p className="text-sm text-ink-muted">{t("resetConfirm")}</p>
          {confirmReset ? (
            <div className="flex gap-2">
              <Button variant="danger" className="flex-1" onClick={() => void game.resetAll()}>
                {t("yes")} — {t("resetProgress")}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>
                {t("cancel")}
              </Button>
            </div>
          ) : (
            <Button variant="danger" onClick={() => setConfirmReset(true)}>
              {t("resetProgress")}
            </Button>
          )}
        </div>
      )}
    </Modal>
  );
}
