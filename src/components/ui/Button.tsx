"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { audio } from "@/game/systems/audio/AudioManager";
import { Icon } from "./Icon";
import type { IconName } from "@/types/game";

type Variant = "primary" | "secondary" | "ghost" | "rose" | "gold" | "danger";
type Size = "sm" | "md" | "lg" | "xl";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  children?: ReactNode;
  /** Play UI sounds (default true). */
  sound?: boolean;
  glow?: boolean;
}

const base =
  "relative inline-flex items-center justify-center gap-2 rounded-full font-sans font-semibold tracking-wide transition-all duration-300 ease-[var(--ease-cinematic)] focus-ring disabled:opacity-40 disabled:pointer-events-none active:scale-[0.97] select-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "text-midnight-900 bg-gradient-to-r from-gold-200 via-rose-200 to-lavender-200 hover:from-gold-100 hover:via-rose-100 hover:to-lavender-100 shadow-[0_10px_40px_-10px_rgba(255,143,184,0.6)]",
  rose: "text-white bg-gradient-to-r from-rose-500 to-rose-400 hover:from-rose-400 hover:to-rose-300 shadow-glow-rose",
  gold: "text-midnight-900 bg-gradient-to-r from-gold-400 to-gold-200 hover:from-gold-300 hover:to-gold-100 shadow-glow-gold",
  secondary:
    "text-ink glass-light hover:bg-white/10 hover:border-white/25",
  ghost: "text-ink-muted hover:text-ink hover:bg-white/5",
  danger: "text-rose-100 border border-rose-500/40 bg-rose-600/10 hover:bg-rose-600/25",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-xs",
  md: "h-11 px-6 text-sm",
  lg: "h-13 px-8 text-base",
  xl: "h-15 px-10 text-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", icon, iconRight, className, children, sound = true, glow, onClick, onMouseEnter, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(base, variants[variant], sizes[size], glow && "animate-pulse-glow motion-safe-only", className)}
      onMouseEnter={(e) => {
        if (sound) audio.sfx("ui-hover", { volume: 0.35 });
        onMouseEnter?.(e);
      }}
      onClick={(e) => {
        if (sound) audio.sfx("ui-click");
        onClick?.(e);
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 14 : 18} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === "sm" ? 14 : 18} />}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  size?: number;
  active?: boolean;
}

/** Round glass icon button used by the HUD. */
export function IconButton({ icon, label, size = 44, active, className, onClick, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      style={{ width: size, height: size }}
      className={cn(
        "glass-light inline-flex items-center justify-center rounded-full text-ink transition-all duration-300 hover:bg-white/15 hover:scale-105 active:scale-95 focus-ring",
        active && "bg-rose-500/30 border-rose-300/50",
        className,
      )}
      onClick={(e) => {
        audio.sfx("ui-click", { volume: 0.6 });
        onClick?.(e);
      }}
      {...rest}
    >
      <Icon name={icon} size={Math.round(size * 0.45)} />
    </button>
  );
}
