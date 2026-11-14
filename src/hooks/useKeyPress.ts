"use client";

import { useEffect } from "react";

/** Fire a callback for the given key codes while the component is mounted. */
export function useKeyPress(codes: readonly string[], handler: (event: KeyboardEvent) => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (codes.includes(event.code)) {
        const target = event.target as HTMLElement | null;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
        handler(event);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [codes, handler, enabled]);
}
