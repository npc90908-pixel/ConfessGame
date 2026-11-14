"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useMemo } from "react";
import { story } from "@/config/story";
import { useT } from "@/hooks/useT";
import { useUIStore } from "@/store/uiStore";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Typewriter } from "@/components/ui/Typewriter";

/** Polaroid memory viewer. */
export default function MemoryModal({ memoryId }: { memoryId: string }) {
  const t = useT();
  const close = useUIStore((s) => s.closeOverlay);
  const memory = useMemo(() => story.memories.find((m) => m.id === memoryId), [memoryId]);
  if (!memory) return null;
  return (
    <Modal onClose={close} size="lg" transparent bodyClassName="!p-0" className="!bg-transparent !border-0 !shadow-none">
      <div className="flex flex-col items-center gap-6 p-4 md:flex-row md:items-stretch md:p-6">
        <motion.figure
          className="w-full max-w-sm shrink-0 rotate-[-2deg] rounded-sm bg-[#fdfaf4] p-3 pb-14 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)]"
          initial={{ rotate: -8, y: 30, opacity: 0 }}
          animate={{ rotate: -2, y: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative aspect-square w-full overflow-hidden bg-midnight-800">
            <Image src={memory.image} alt={memory.title} fill sizes="(max-width: 768px) 90vw, 420px" className="object-cover" priority />
          </div>
          <figcaption className="mt-4 text-center font-script text-2xl text-[#4a3a4f]">{memory.title}</figcaption>
        </motion.figure>
        <div className="glass flex w-full flex-col justify-between rounded-3xl p-6 md:p-8">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-rose-300/90">
              {t("memories")} {memory.date ? `· ${memory.date}` : ""}
            </p>
            <h2 className="mt-2 font-display text-3xl text-ink md:text-4xl">{memory.title}</h2>
            <Typewriter text={memory.caption} speed={44} className="mt-5 font-display text-xl leading-relaxed text-lavender-100 md:text-2xl" />
          </div>
          <div className="mt-8 flex justify-end">
            <Button variant="rose" iconRight="arrow-right" onClick={close}>
              {t("continue")}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
