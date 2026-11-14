"use client";

import { KEYBINDINGS, type Action } from "@/config/controls";

/**
 * Mutable input state shared by the controllers. Updated by DOM listeners
 * (keyboard), the virtual joystick and the look/drag surface. Read every
 * frame inside useFrame — never through React state.
 */
export interface InputState {
  keys: Set<string>;
  /** Normalised joystick vector (-1..1). x = right, y = forward. */
  joystick: { x: number; y: number; active: boolean };
  /** Accumulated look delta in pixels since last frame. */
  look: { dx: number; dy: number };
  /** Pinch / wheel zoom delta. */
  zoom: number;
  /** One-shot actions queued by buttons (consumed each frame). */
  pressed: Set<Action>;
  /** Held virtual buttons from the mobile HUD. */
  virtual: { jump: boolean; run: boolean };
}

export const input: InputState = {
  keys: new Set(),
  joystick: { x: 0, y: 0, active: false },
  look: { dx: 0, dy: 0 },
  zoom: 0,
  pressed: new Set(),
  virtual: { jump: false, run: false },
};

const codeToActions = new Map<string, Action[]>();
for (const [action, codes] of Object.entries(KEYBINDINGS) as [Action, readonly string[]][]) {
  for (const code of codes) {
    const list = codeToActions.get(code) ?? [];
    list.push(action);
    codeToActions.set(code, list);
  }
}

export function isActionHeld(action: Action): boolean {
  const codes = KEYBINDINGS[action] as readonly string[];
  for (const code of codes) if (input.keys.has(code)) return true;
  if (action === "jump" && input.virtual.jump) return true;
  if (action === "run" && input.virtual.run) return true;
  return false;
}

/** Queue a one-shot action (from mobile buttons or UI). */
export function pressAction(action: Action) {
  input.pressed.add(action);
}

export function consumeAction(action: Action): boolean {
  if (input.pressed.has(action)) {
    input.pressed.delete(action);
    return true;
  }
  return false;
}

/** Movement axis from keyboard + joystick: x = strafe right, y = forward. */
export function getMoveAxis(out: { x: number; y: number }) {
  let x = 0;
  let y = 0;
  if (isActionHeld("forward")) y += 1;
  if (isActionHeld("backward")) y -= 1;
  if (isActionHeld("right")) x += 1;
  if (isActionHeld("left")) x -= 1;
  if (input.joystick.active) {
    x += input.joystick.x;
    y += input.joystick.y;
  }
  const len = Math.hypot(x, y);
  if (len > 1) {
    x /= len;
    y /= len;
  }
  out.x = x;
  out.y = y;
  return out;
}

/** Read and clear the accumulated look delta. */
export function consumeLook(out: { dx: number; dy: number }) {
  out.dx = input.look.dx;
  out.dy = input.look.dy;
  input.look.dx = 0;
  input.look.dy = 0;
  return out;
}

export function consumeZoom(): number {
  const z = input.zoom;
  input.zoom = 0;
  return z;
}

export function clearInput() {
  input.keys.clear();
  input.joystick.x = 0;
  input.joystick.y = 0;
  input.joystick.active = false;
  input.look.dx = 0;
  input.look.dy = 0;
  input.zoom = 0;
  input.pressed.clear();
  input.virtual.jump = false;
  input.virtual.run = false;
}

let listenersAttached = false;

/** Attach global keyboard listeners once. Returns a disposer. */
export function attachKeyboard(onAction?: (action: Action, event: KeyboardEvent) => void) {
  if (typeof window === "undefined" || listenersAttached) return () => undefined;
  listenersAttached = true;

  const isTypingTarget = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    return Boolean(el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable));
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (isTypingTarget(event.target)) return;
    if (!event.repeat) {
      input.keys.add(event.code);
      const actions = codeToActions.get(event.code);
      if (actions) {
        for (const action of actions) {
          input.pressed.add(action);
          onAction?.(action, event);
        }
      }
    }
    // Prevent the page from scrolling / focusing with game keys.
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(event.code)) {
      event.preventDefault();
    }
  };
  const onKeyUp = (event: KeyboardEvent) => {
    input.keys.delete(event.code);
  };
  const onBlur = () => {
    input.keys.clear();
    input.virtual.jump = false;
    input.virtual.run = false;
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  return () => {
    listenersAttached = false;
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
  };
}
