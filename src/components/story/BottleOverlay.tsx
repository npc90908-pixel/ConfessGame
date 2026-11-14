"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { story } from "@/config/story";
import { useT } from "@/hooks/useT";
import { useUIStore } from "@/store/uiStore";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Typewriter } from "@/components/ui/Typewriter";
import { Icon } from "@/components/ui/Icon";

/** A rolled note pulled out of a message bottle. */
export default function BottleOverlay({ bottleId }: { bottleId: string }) {
  const t = useT();
  const close = useUIStore((s) => s.closeOverlay);
  const bottle = useMemo(() => story.bottles.find((b) => b.id === bottleId), [bottleId]);
  if (!bottle) return null;
  return (
    <Modal onClose={close} size="md" transparent className="!bg-transparent !border-0 !shadow-none" bodyClassName="!p-0">
      <motion.div
        className="paper selectable relative mx-auto w-full max-w-lg rounded-2xl px-8 py-10 md:px-12"
        initial={{ scaleY: 0.1, opacity: 0, transformOrigin: "top" }}
        animate={{ scaleY: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="absolute -top-5 left-1/2 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full bg-[#8fd3ff] text-midnight-900 shadow-lg">
          <Icon name="bottle" size={20} />
        </span>
        <p className="text-center text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-rose-600/80">{bottle.title}</p>
        <Typewriter text={bottle.text} speed={44} className="mt-6 font-display text-xl leading-relaxed text-[#3a2a3f] md:text-2xl" />
        <p className="mt-8 text-right font-script text-3xl text-[#5a3a5f]">— {story.senderName}</p>
        <div className="mt-6 flex justify-center">
          <Button variant="rose" iconRight="arrow-right" onClick={close}>
            {t("continue")}
          </Button>
        </div>
      </motion.div>
    </Modal>
  );
}
