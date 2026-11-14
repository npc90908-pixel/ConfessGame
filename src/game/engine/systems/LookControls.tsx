"use client";

import { useEffect, type RefObject } from "react";
import { input } from "../input";

/**
 * Turns pointer drags (mouse or touch) on the canvas container into look
 * deltas. The virtual joystick stops propagation of its own pointer events
 * so a thumb on the stick never rotates the camera.
 */
export function useLookControls(containerRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !enabled) return;

    const pointers = new Map<number, { x: number; y: number }>();
    let pinchDistance = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0 && e.button !== 2) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = Array.from(pointers.values());
        pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      if (pointers.size === 2) {
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const [a, b] = Array.from(pointers.values());
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDistance > 0) input.zoom += (pinchDistance - d) * 2;
        pinchDistance = d;
        return;
      }
      const scale = e.pointerType === "touch" ? 1.4 : 1;
      input.look.dx += (e.clientX - prev.x) * scale;
      input.look.dy += (e.clientY - prev.y) * scale;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    };
    const onPointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchDistance = 0;
    };
    const onWheel = (e: WheelEvent) => {
      input.zoom += e.deltaY;
      e.preventDefault();
    };
    const onContextMenu = (e: Event) => e.preventDefault();

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("contextmenu", onContextMenu);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("contextmenu", onContextMenu);
      pointers.clear();
    };
  }, [containerRef, enabled]);
}
