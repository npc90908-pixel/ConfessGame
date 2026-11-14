"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { story } from "@/config/story";
import { useT } from "@/hooks/useT";
import { useUIStore } from "@/store/uiStore";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/**
 * Letter fragment with animated typography — each line rises out of the
 * dark with a blur, like words finally being said.
 */
export default function FragmentOverlay({ fragmentId }: { fragmentId: string }) {
  const t = useT();
  const close = useUIStore((s) => s.closeOverlay);
  const fragment = useMemo(() => story.fragments.find((f) => f.id === fragmentId), [fragmentId]);
  const key = useMemo(() => story.keys.find((k) => k.id === fragment?.keyId), [fragment]);
  if (!fragment) return null;
  return (
    <Modal onClose={close} size="lg" transparent className="!bg-transparent !border-0 !shadow-none" bodyClassName="!p-0">
      <div className="flex flex-col items-center px-4 py-8 text-center">
        <motion.span
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{ color: key?.color ?? "#f3d08a", background: `${key?.color ?? "#f3d08a"}22`, boxShadow: `0 0 40px ${key?.color ?? "#f3d08a"}66` }}
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <Icon name="key" size={26} />
        </motion.span>
        <motion.p
          className="mt-5 text-[0.7rem] font-semibold uppercase tracking-[0.4em] text-rose-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {fragment.title}
        </motion.p>
        <div className="mt-8 space-y-6">
          {fragment.lines.map((line, i) => (
            <motion.p
              key={i}
              className="font-display text-2xl leading-snug text-ink md:text-4xl"
              initial={{ opacity: 0, y: 24, filter: "blur(10px)", letterSpacing: "0.1em" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)", letterSpacing: "0em" }}
              transition={{ delay: 0.8 + i * 1.1, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {line}
            </motion.p>
          ))}
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 + fragment.lines.length * 1.1 }} className="mt-12">
          <Button variant="rose" iconRight="arrow-right" onClick={close}>
            {t("continue")}
          </Button>
        </motion.div>
      </div>
    </Modal>
  );
}
