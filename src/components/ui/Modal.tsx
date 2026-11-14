"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { IconButton } from "./Button";

export interface ModalProps {
  children: ReactNode;
  onClose?: () => void;
  title?: ReactNode;
  eyebrow?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
  /** Hide the dark backdrop blur (used by overlays on top of 3D moments). */
  transparent?: boolean;
  bodyClassName?: string;
  closeOnBackdrop?: boolean;
  labelledBy?: string;
}

const sizes = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
  full: "max-w-none w-full h-full rounded-none",
};

/** Accessible glass modal with motion in/out. One is open at a time. */
export function Modal({
  children,
  onClose,
  title,
  eyebrow,
  size = "md",
  className,
  transparent,
  bodyClassName,
  closeOnBackdrop = true,
  labelledBy,
}: ModalProps) {
  const t = useT();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>("button, [href], input, [tabindex]:not([tabindex='-1'])");
    first?.focus({ preventScroll: true });
    return () => previous?.focus?.({ preventScroll: true });
  }, []);

  return (
    <motion.div
      className={cn(
        "pointer-events-auto absolute inset-0 z-40 flex items-center justify-center p-3 sm:p-6",
        !transparent && "bg-midnight-950/55 backdrop-blur-sm",
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onPointerDown={(e) => {
        if (closeOnBackdrop && onClose && e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <motion.div
        ref={panel}
        className={cn(
          "glass relative flex max-h-full w-full flex-col overflow-hidden rounded-3xl",
          sizes[size],
          className,
        )}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {(title || eyebrow || onClose) && (
          <header className="flex items-start justify-between gap-4 px-6 pt-6 md:px-8 md:pt-7">
            <div className="min-w-0">
              {eyebrow && <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-rose-300/90">{eyebrow}</p>}
              {title && (
                <h2 id={labelledBy} className="mt-1 font-display text-3xl leading-tight text-ink md:text-4xl">
                  {title}
                </h2>
              )}
            </div>
            {onClose && <IconButton icon="close" label={t("close")} size={40} onClick={onClose} className="shrink-0" />}
          </header>
        )}
        <div className={cn("scrollbar-elegant min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-4 md:px-8 md:pb-8", bodyClassName)}>{children}</div>
      </motion.div>
    </motion.div>
  );
}
