"use client";

import { useEffect, useRef } from "react";
import { input, pressAction } from "@/game/engine/input";
import { runtime } from "@/game/engine/runtime";
import { useSettingsStore } from "@/store/settingsStore";
import { useT } from "@/hooks/useT";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

const RADIUS = 56;

/**
 * Virtual joystick. Writes directly into the shared input state; stops
 * propagation so the look controls never see these touches.
 */
function VirtualJoystick({ side }: { side: "left" | "right" }) {
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = base.current;
    if (!el) return;

    const setKnob = (dx: number, dy: number) => {
      if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const update = (clientX: number, clientY: number) => {
      let dx = clientX - origin.current.x;
      let dy = clientY - origin.current.y;
      const len = Math.hypot(dx, dy);
      if (len > RADIUS) {
        dx = (dx / len) * RADIUS;
        dy = (dy / len) * RADIUS;
      }
      setKnob(dx, dy);
      const dead = 0.08;
      let nx = dx / RADIUS;
      let ny = -dy / RADIUS;
      const mag = Math.hypot(nx, ny);
      if (mag < dead) {
        nx = 0;
        ny = 0;
      } else {
        const scaled = (mag - dead) / (1 - dead);
        nx = (nx / mag) * scaled;
        ny = (ny / mag) * scaled;
      }
      input.joystick.x = nx;
      input.joystick.y = ny;
      input.joystick.active = true;
    };
    const onDown = (e: PointerEvent) => {
      if (pointerId.current !== null) return;
      pointerId.current = e.pointerId;
      const rect = el.getBoundingClientRect();
      origin.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      el.setPointerCapture(e.pointerId);
      update(e.clientX, e.clientY);
      e.stopPropagation();
      e.preventDefault();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId.current) return;
      update(e.clientX, e.clientY);
      e.stopPropagation();
      e.preventDefault();
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId.current) return;
      pointerId.current = null;
      input.joystick.x = 0;
      input.joystick.y = 0;
      input.joystick.active = false;
      setKnob(0, 0);
      e.stopPropagation();
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      input.joystick.x = 0;
      input.joystick.y = 0;
      input.joystick.active = false;
    };
  }, []);

  return (
    <div
      ref={base}
      className={cn(
        "pointer-events-auto absolute bottom-[max(1.5rem,var(--safe-bottom))] h-36 w-36 touch-none rounded-full border border-white/15 bg-white/5 backdrop-blur-md",
        side === "left" ? "left-[max(1.25rem,var(--safe-left))]" : "right-[max(1.25rem,var(--safe-right))]",
      )}
      role="application"
      aria-label="Virtual joystick"
    >
      <div className="absolute inset-0 m-auto h-2 w-2 rounded-full bg-white/20" />
      <div
        ref={knob}
        className="absolute left-1/2 top-1/2 -ml-7 -mt-7 h-14 w-14 rounded-full bg-gradient-to-br from-rose-400/90 to-lavender-400/90 shadow-glow-rose transition-transform duration-75"
      />
    </div>
  );
}

function HoldButton({
  icon,
  label,
  onPress,
  onHold,
  className,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  onPress?: () => void;
  onHold?: (down: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "pointer-events-auto flex h-16 w-16 touch-none items-center justify-center rounded-full border border-white/15 bg-white/10 text-ink backdrop-blur-md transition-transform active:scale-90 active:bg-white/25",
        className,
      )}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onPress?.();
        onHold?.(true);
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        onHold?.(false);
      }}
      onPointerCancel={() => onHold?.(false)}
      onPointerLeave={() => onHold?.(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Icon name={icon} size={26} />
    </button>
  );
}

/** Touch HUD: joystick + jump/run buttons (boat mode shows only the stick). */
export function MobileControls() {
  const side = useSettingsStore((s) => s.joystickSide);
  const t = useT();
  const other = side === "left" ? "right" : "left";
  const boat = runtime.player.mode === "boat";
  return (
    <>
      <VirtualJoystick side={side} />
      <div
        className={cn(
          "absolute bottom-[max(1.5rem,var(--safe-bottom))] flex flex-col items-center gap-3",
          other === "right" ? "right-[max(1.5rem,var(--safe-right))]" : "left-[max(1.5rem,var(--safe-left))]",
        )}
      >
        {!boat && <HoldButton icon="jump" label={t("jumpHint")} onPress={() => pressAction("jump")} />}
        <HoldButton
          icon="play"
          label={boat ? t("steer") : t("runHint")}
          onHold={(down) => {
            input.virtual.run = down;
          }}
          className={boat ? "opacity-0 pointer-events-none" : ""}
        />
      </div>
    </>
  );
}
