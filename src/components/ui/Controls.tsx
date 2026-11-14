"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import { audio } from "@/game/systems/audio/AudioManager";

/* -------------------------------------------------------------------------- */
/*  Slider                                                                    */
/* -------------------------------------------------------------------------- */

export interface SliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  disabled?: boolean;
}

export function Slider({ label, value, min = 0, max = 1, step = 0.01, onChange, format, disabled }: SliderProps) {
  const id = useId();
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div className={cn("flex flex-col gap-2", disabled && "opacity-50")}>
      <div className="flex items-center justify-between text-sm">
        <label htmlFor={id} className="text-ink">
          {label}
        </label>
        <span className="tabular-nums text-ink-muted">{format ? format(value) : `${Math.round(percent)}%`}</span>
      </div>
      <input
        id={id}
        type="range"
        className="slider"
        style={{ "--value": `${percent}%` } as React.CSSProperties}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={() => audio.sfx("ui-hover", { volume: 0.4 })}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Toggle                                                                    */
/* -------------------------------------------------------------------------- */

export interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ label, description, checked, onChange }: ToggleProps) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm text-ink">
          {label}
        </label>
        {description && <p className="text-xs text-ink-faint">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => {
          audio.sfx("ui-click", { volume: 0.6 });
          onChange(!checked);
        }}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-300 focus-ring",
          checked ? "border-rose-300/60 bg-rose-500/70" : "border-white/15 bg-white/10",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5.5 w-5.5 rounded-full bg-white shadow transition-transform duration-300 ease-[var(--ease-cinematic)]",
            checked ? "translate-x-[1.45rem]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Segmented control                                                         */
/* -------------------------------------------------------------------------- */

export interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-ink">{label}</span>
      <div className="grid gap-1 rounded-2xl bg-white/5 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => {
              audio.sfx("ui-click", { volume: 0.6 });
              onChange(option.value);
            }}
            className={cn(
              "rounded-xl px-2 py-2 text-xs font-semibold transition-all duration-300 focus-ring",
              option.value === value
                ? "bg-gradient-to-r from-rose-400/80 to-lavender-400/80 text-white shadow"
                : "text-ink-muted hover:bg-white/5 hover:text-ink",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Progress bar                                                              */
/* -------------------------------------------------------------------------- */

export function ProgressBar({ value, className, tone = "rose" }: { value: number; className?: string; tone?: "rose" | "gold" }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-white/10", className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-[var(--ease-cinematic)]",
          tone === "rose" ? "bg-gradient-to-r from-rose-400 to-lavender-300" : "bg-gradient-to-r from-gold-400 to-gold-200",
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}
