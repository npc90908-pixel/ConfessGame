"use client";

import { useState } from "react";
import { game } from "@/game/engine/GameManager";
import { useQualityStore } from "@/game/systems/quality";
import { useT } from "@/hooks/useT";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  SETTING_RANGES,
  useSettingsStore,
  type MotionSetting,
  type QualitySetting,
  type ShadowSetting,
  type TextSizeSetting,
} from "@/store/settingsStore";
import { useUIStore } from "@/store/uiStore";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Segmented, Slider, Toggle } from "@/components/ui/Controls";
import type { IconName } from "@/types/game";
import type { Language } from "@/types/story";
import { cn } from "@/lib/utils";

type Tab = "audio" | "graphics" | "gameplay" | "accessibility" | "progress";

const TABS: Array<{ key: Tab; icon: IconName }> = [
  { key: "audio", icon: "volume" },
  { key: "graphics", icon: "sparkles" },
  { key: "gameplay", icon: "compass" },
  { key: "accessibility", icon: "hand" },
  { key: "progress", icon: "map" },
];

const times = (v: number) => `${v.toFixed(2)}×`;
const percent = (v: number) => `${Math.round(v * 100)}%`;

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
      <div role="tablist" aria-label={t("settings")} className="scrollbar-none -mx-1 mb-6 flex gap-1 overflow-x-auto rounded-2xl bg-white/5 p-1">
        {TABS.map(({ key, icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] transition-all focus-ring sm:flex-1 sm:text-xs",
              tab === key ? "bg-gradient-to-r from-rose-400/80 to-lavender-400/80 text-white shadow" : "text-ink-muted hover:text-ink",
            )}
          >
            <Icon name={icon} size={13} className="opacity-80" />
            <span>{t(key)}</span>
          </button>
        ))}
      </div>

      {tab === "audio" && (
        <div className="space-y-6" role="tabpanel">
          <Toggle label={t("mute")} checked={s.muted} onChange={s.setMuted} />
          <Slider label={t("masterVolume")} value={s.masterVolume} onChange={s.setMasterVolume} disabled={s.muted} />
          <Slider label={t("musicVolume")} value={s.musicVolume} onChange={s.setMusicVolume} disabled={s.muted} />
          <Slider label={t("sfxVolume")} value={s.sfxVolume} onChange={s.setSfxVolume} disabled={s.muted} />
          <Slider label={t("ambientVolume")} value={s.ambientVolume} onChange={s.setAmbientVolume} disabled={s.muted} />
        </div>
      )}

      {tab === "graphics" && (
        <div className="space-y-6" role="tabpanel">
          <Segmented<QualitySetting>
            label={`${t("quality")}${s.quality === "auto" ? ` (${t("auto").toLowerCase()} → ${t(autoTier)})` : ""}`}
            value={s.quality}
            onChange={s.setQuality}
            options={[
              { value: "auto", label: t("auto") },
              { value: "low", label: t("low") },
              { value: "medium", label: t("medium") },
              { value: "high", label: t("high") },
            ]}
          />
          <Segmented<ShadowSetting>
            label={t("shadowQuality")}
            value={s.shadowQuality}
            onChange={s.setShadowQuality}
            options={[
              { value: "auto", label: t("auto") },
              { value: "off", label: t("off") },
              { value: "low", label: t("low") },
              { value: "medium", label: t("medium") },
              { value: "high", label: t("high") },
            ]}
          />
          <Slider label={t("particleDensity")} value={s.particleDensity} {...SETTING_RANGES.particleDensity} onChange={s.setParticleDensity} format={percent} />
          <Slider label={t("resolutionScale")} value={s.resolutionScale} {...SETTING_RANGES.resolutionScale} onChange={s.setResolutionScale} format={percent} />
          <Toggle label={t("postProcessing")} checked={s.postProcessing} onChange={s.setPostProcessing} />
          <Toggle label={t("showPerformance")} checked={s.showPerformance} onChange={s.setShowPerformance} />
        </div>
      )}

      {tab === "gameplay" && (
        <div className="space-y-6" role="tabpanel">
          <Slider label={t("cameraSensitivity")} value={s.cameraSensitivity} {...SETTING_RANGES.cameraSensitivity} onChange={s.setCameraSensitivity} format={times} />
          <Slider label={t("movementSensitivity")} value={s.movementSensitivity} {...SETTING_RANGES.movementSensitivity} onChange={s.setMovementSensitivity} format={times} />
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
          <Toggle label={t("controlHints")} checked={s.controlHints} onChange={s.setControlHints} />
          <Toggle label={t("showHud")} description={s.showHud ? undefined : t("hudHiddenHint")} checked={s.showHud} onChange={s.setShowHud} />
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
        </div>
      )}

      {tab === "accessibility" && (
        <div className="space-y-6" role="tabpanel">
          <Toggle label={t("subtitles")} checked={s.subtitles} onChange={s.setSubtitles} />
          <Segmented<TextSizeSetting>
            label={t("textSize")}
            value={s.textSize}
            onChange={s.setTextSize}
            options={[
              { value: "small", label: t("textSmall") },
              { value: "medium", label: t("textMedium") },
              { value: "large", label: t("textLarge") },
            ]}
          />
          <Slider label={t("animationIntensity")} value={s.animationIntensity} {...SETTING_RANGES.animationIntensity} onChange={s.setAnimationIntensity} format={percent} />
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
        </div>
      )}

      {tab === "progress" && (
        <div className="space-y-4" role="tabpanel">
          <p className="text-xs text-ink-faint">{t("settingsSavedHint")}</p>
          <Button variant="ghost" onClick={() => s.resetToDefaults()}>
            {t("restoreDefaults")}
          </Button>
          <hr className="border-white/10" />
          {inGame && <p className="text-xs text-ink-faint">{t("progressAutosave")}</p>}
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
