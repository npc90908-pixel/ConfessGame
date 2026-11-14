"use client";

import { create } from "zustand";
import type { DialogueRequest, EnvironmentId, GamePhase, IconName, Overlay, Toast } from "@/types/game";

export interface InteractionPrompt {
  id: string;
  label: string;
  icon?: IconName;
}

export interface UIState {
  phase: GamePhase;
  /** Environment currently mounted inside the canvas (null on the title screen). */
  activeEnvironment: EnvironmentId | null;
  /** Bumped to force an environment remount (restart chapter). */
  environmentKey: number;
  /** Environment that has finished mounting its assets. */
  readyEnvironment: EnvironmentId | null;
  /** Which full-screen overlay is open (only one visible at a time). */
  overlay: Overlay | null;
  /** Overlays to return to when the current one closes (pause → gallery → memory). */
  overlayStack: Overlay[];
  /** True while a scripted camera sequence owns the camera. */
  cinematic: boolean;
  cinematicSkippable: boolean;
  /** Set while an environment is being swapped. */
  transition: { active: boolean; label?: string };
  prompt: InteractionPrompt | null;
  dialogue: DialogueRequest | null;
  dialogueIndex: number;
  subtitle: string | null;
  toasts: Toast[];
  hudHidden: boolean;
  /** Fade-to-black veil used by scene transitions, 0..1. */
  veil: number;
  objectiveFlash: number;

  setPhase: (p: GamePhase) => void;
  setActiveEnvironment: (env: EnvironmentId | null, remount?: boolean) => void;
  setReadyEnvironment: (env: EnvironmentId | null) => void;
  /** Replace whatever is open (clears the stack). */
  openOverlay: (o: Overlay) => void;
  /** Open on top of the current overlay; closing returns to it. */
  pushOverlay: (o: Overlay) => void;
  closeOverlay: () => void;
  /** Close everything, including stacked overlays. */
  closeAllOverlays: () => void;
  setCinematic: (active: boolean, skippable?: boolean) => void;
  setTransition: (active: boolean, label?: string) => void;
  setPrompt: (p: InteractionPrompt | null) => void;
  showDialogue: (d: DialogueRequest) => void;
  advanceDialogue: () => void;
  skipDialogue: () => void;
  setSubtitle: (s: string | null) => void;
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
  setHudHidden: (v: boolean) => void;
  setVeil: (v: number) => void;
  flashObjective: () => void;
}

let toastSeq = 1;

export const useUIStore = create<UIState>()((set, get) => ({
  phase: "boot",
  activeEnvironment: null,
  environmentKey: 0,
  readyEnvironment: null,
  overlay: null,
  overlayStack: [],
  cinematic: false,
  cinematicSkippable: true,
  transition: { active: false },
  prompt: null,
  dialogue: null,
  dialogueIndex: 0,
  subtitle: null,
  toasts: [],
  hudHidden: false,
  veil: 1,
  objectiveFlash: 0,

  setPhase: (phase) => set({ phase }),
  setActiveEnvironment: (activeEnvironment, remount = false) =>
    set((s) => ({ activeEnvironment, environmentKey: remount ? s.environmentKey + 1 : s.environmentKey })),
  setReadyEnvironment: (readyEnvironment) => set({ readyEnvironment }),
  openOverlay: (overlay) => set({ overlay, overlayStack: [] }),
  pushOverlay: (overlay) =>
    set((s) => ({ overlay, overlayStack: s.overlay ? [...s.overlayStack, s.overlay] : s.overlayStack })),
  closeOverlay: () =>
    set((s) => {
      if (s.overlayStack.length === 0) return { overlay: null };
      const stack = s.overlayStack.slice(0, -1);
      return { overlay: s.overlayStack[s.overlayStack.length - 1], overlayStack: stack };
    }),
  closeAllOverlays: () => set({ overlay: null, overlayStack: [] }),
  setCinematic: (cinematic, cinematicSkippable = true) => set({ cinematic, cinematicSkippable }),
  setTransition: (active, label) => set({ transition: { active, label } }),
  setPrompt: (prompt) => {
    const current = get().prompt;
    if (current?.id === prompt?.id && current?.label === prompt?.label) return;
    set({ prompt });
  },
  showDialogue: (dialogue) => set({ dialogue, dialogueIndex: 0 }),
  advanceDialogue: () => {
    const { dialogue, dialogueIndex } = get();
    if (!dialogue) return;
    if (dialogueIndex < dialogue.lines.length - 1) {
      set({ dialogueIndex: dialogueIndex + 1 });
    } else {
      set({ dialogue: null, dialogueIndex: 0 });
      dialogue.onComplete?.();
    }
  },
  skipDialogue: () => {
    const { dialogue } = get();
    if (!dialogue) return;
    set({ dialogue: null, dialogueIndex: 0 });
    dialogue.onComplete?.();
  },
  setSubtitle: (subtitle) => set({ subtitle }),
  pushToast: (t) => {
    const id = toastSeq++;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
    setTimeout(() => get().dismissToast(id), 4200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setHudHidden: (hudHidden) => set({ hudHidden }),
  setVeil: (veil) => set({ veil }),
  flashObjective: () => set((s) => ({ objectiveFlash: s.objectiveFlash + 1 })),
}));

/** True when the player should NOT be able to move (menus, dialogue, cinematics). */
export const selectControlsLocked = (s: UIState) =>
  s.phase !== "playing" || s.overlay !== null || s.cinematic || s.dialogue !== null || s.transition.active;
