"use client";

import { useEffect } from "react";
import { story } from "@/config/story";
import { validateStory } from "@/config/schema";
import { attachKeyboard } from "@/game/engine/input";
import { game } from "@/game/engine/GameManager";
import { useWebGL } from "@/hooks/useWebGL";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSettingsStore } from "@/store/settingsStore";
import { useUIStore } from "@/store/uiStore";
import { BootSplash } from "./BootSplash";
import { GameCanvas } from "./GameCanvas";
import { UILayer } from "./UILayer";
import { WebGLFallback } from "./WebGLFallback";

// Validate the personalised content once; a typo should fail loudly in dev.
let validated = false;

export default function GameRoot() {
  const webgl = useWebGL();
  useReducedMotion();
  const textSize = useSettingsStore((s) => s.textSize);

  // Accessibility text size is applied at the root so every rem scales.
  useEffect(() => {
    document.documentElement.dataset.textSize = textSize;
  }, [textSize]);

  useEffect(() => {
    if (!validated) {
      validated = true;
      try {
        validateStory(story);
      } catch (error) {
        console.error(error);
      }
    }
  }, []);

  // Global keyboard shortcuts (pause, inventory, skip).
  useEffect(() => {
    return attachKeyboard((action, event) => {
      const ui = useUIStore.getState();
      if (action === "pause") {
        if (ui.phase !== "playing") return;
        if (ui.overlay?.type === "pause") game.resume();
        else if (ui.overlay && ["inventory", "gallery", "settings", "memory", "controls"].includes(ui.overlay.type)) {
          ui.closeOverlay();
        } else if (!ui.overlay && !ui.cinematic && !ui.dialogue) {
          game.pause();
        } else if (ui.cinematic && ui.cinematicSkippable) {
          game.skipCinematic();
        }
        event.preventDefault();
      }
      if (action === "inventory") {
        game.toggleInventory();
        event.preventDefault();
      }
      if (action === "skip" && ui.cinematic && ui.cinematicSkippable && !ui.dialogue && !ui.overlay) {
        if (event.code !== "Escape") game.skipCinematic();
      }
    });
  }, []);

  if (webgl === null) return <BootSplash />;
  if (!webgl.supported) return <WebGLFallback />;

  return (
    <div className="fixed inset-0 overflow-hidden bg-midnight-950">
      <GameCanvas />
      <UILayer />
    </div>
  );
}
