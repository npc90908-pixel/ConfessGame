"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface GlassPanelProps extends HTMLMotionProps<"div"> {
  children?: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  tone?: "dark" | "light";
}

const paddings = {
  none: "",
  sm: "p-4",
  md: "p-6 md:p-8",
  lg: "p-8 md:p-12",
};

/** Frosted glass surface used by every menu and modal. */
export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(function GlassPanel(
  { children, className, padding = "md", tone = "dark", ...rest },
  ref,
) {
  return (
    <motion.div
      ref={ref}
      className={cn(tone === "dark" ? "glass" : "glass-light", "rounded-3xl", paddings[padding], className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
});

/** Decorative hairline with a soft glow, used as a section divider. */
export function Hairline({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "h-px w-full bg-gradient-to-r from-transparent via-lavender-300/50 to-transparent",
        className,
      )}
    />
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-rose-300/90", className)}>
      {children}
    </p>
  );
}
