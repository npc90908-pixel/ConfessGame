"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useUIStore } from "@/store/uiStore";
import { Icon } from "@/components/ui/Icon";

/** Collection notifications (top-right stack). */
export function Toasts() {
  const toasts = useUIStore((s) => s.toasts);
  const dismiss = useUIStore((s) => s.dismissToast);
  return (
    <div className="pointer-events-none absolute right-[max(1rem,var(--safe-right))] top-[calc(max(1rem,var(--safe-top))+3.75rem)] z-30 flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.button
            key={toast.id}
            type="button"
            onClick={() => dismiss(toast.id)}
            className="glass pointer-events-auto flex items-start gap-3 rounded-2xl p-3 text-left"
            initial={{ opacity: 0, x: 30, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <span
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ background: `${toast.color ?? "#b9a7ff"}22`, color: toast.color ?? "#b9a7ff", boxShadow: `0 0 18px ${toast.color ?? "#b9a7ff"}55` }}
            >
              <Icon name={toast.icon ?? "sparkles"} size={18} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">{toast.title}</span>
              {toast.description && <span className="mt-0.5 line-clamp-2 block text-xs text-ink-muted">{toast.description}</span>}
            </span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
