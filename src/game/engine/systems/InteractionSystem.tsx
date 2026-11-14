"use client";

import { useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { selectControlsLocked, useUIStore } from "@/store/uiStore";
import { consumeAction } from "../input";
import { triggerActiveInteraction, updateInteractions } from "../interactions";

/** Per-frame proximity scan + keyboard "E" handling. */
export function InteractionSystem() {
  useFrame(() => {
    const ui = useUIStore.getState();
    const locked = selectControlsLocked(ui);
    updateInteractions(locked);
    if (!locked && consumeAction("interact")) {
      triggerActiveInteraction();
    } else {
      consumeAction("interact");
    }
  });

  // Make sure the prompt disappears when the system unmounts.
  useEffect(() => () => useUIStore.getState().setPrompt(null), []);
  return null;
}
