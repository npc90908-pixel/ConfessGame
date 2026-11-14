"use client";

import { useEffect, useRef, useState } from "react";
import { story } from "@/config/story";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { audio } from "@/game/systems/audio/AudioManager";
import { cn } from "@/lib/utils";

export interface TypewriterProps {
  text: string;
  /** Characters per second before animationSpeed scaling. */
  speed?: number;
  /** Delay before typing starts (ms). */
  delay?: number;
  /** When true, the full text is shown immediately. */
  instant?: boolean;
  onDone?: () => void;
  className?: string;
  caret?: boolean;
  sound?: boolean;
  as?: "p" | "span" | "div" | "h1" | "h2";
}

/**
 * Typewriter reveal. Re-renders only a slice of the text so it stays cheap.
 * Respects reduced motion (shows text instantly) and the global animationSpeed.
 * Re-key the component to restart it for a new line.
 */
export function Typewriter({
  text,
  speed = 38,
  delay = 0,
  instant,
  onDone,
  className,
  caret = true,
  sound = false,
  as: Tag = "p",
}: TypewriterProps) {
  const reduced = useReducedMotion();
  const skip = Boolean(instant) || reduced || speed <= 0;
  // `count` is only authoritative while animating; `skip` overrides it.
  const [count, setCount] = useState(0);
  const shown = skip ? text.length : Math.min(count, text.length);
  const done = shown >= text.length;
  const onDoneRef = useRef(onDone);
  const notified = useRef(false);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  // Drive the reveal from rAF callbacks (never synchronously in the effect body).
  useEffect(() => {
    if (skip) return;
    let frame = 0;
    let start = 0;
    let lastTick = 0;
    const cps = speed * story.animationSpeed;
    const tick = (now: number) => {
      if (!start) start = now;
      const elapsed = (now - start) / 1000;
      const next = Math.min(text.length, Math.floor(elapsed * cps));
      setCount(next);
      if (sound && next > lastTick && now - lastTick > 70 && text[next - 1] !== " ") {
        audio.sfx("typewriter", { volume: 0.18, rate: 0.9 + Math.random() * 0.25 });
        lastTick = now;
      }
      if (next < text.length) frame = requestAnimationFrame(tick);
    };
    const timeout = window.setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, delay);
    return () => {
      window.clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [text, speed, delay, skip, sound]);

  // Fire onDone exactly once per text, whether typed out or skipped.
  useEffect(() => {
    if (!done || notified.current) return;
    notified.current = true;
    onDoneRef.current?.();
  }, [done]);

  return (
    <Tag className={className} aria-label={text}>
      <span className={cn(caret && !done && "caret")}>{text.slice(0, shown)}</span>
      {/* keep layout height stable while typing */}
      <span className="invisible" aria-hidden>
        {text.slice(shown)}
      </span>
    </Tag>
  );
}
