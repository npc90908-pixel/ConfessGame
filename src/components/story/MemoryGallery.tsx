"use client";

import Image from "next/image";
import { useState } from "react";
import { story } from "@/config/story";
import { useT } from "@/hooks/useT";
import { useProgressStore } from "@/store/progressStore";
import { useUIStore } from "@/store/uiStore";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { findLetter } from "./LetterOverlay";

/** Gallery of every memory, bottle message and letter discovered so far. */
export default function MemoryGallery() {
  const t = useT();
  const close = useUIStore((s) => s.closeOverlay);
  const open = useUIStore((s) => s.pushOverlay);
  const viewed = useProgressStore((s) => s.viewedMemories);
  const bottles = useProgressStore((s) => s.openedBottles);
  const fragments = useProgressStore((s) => s.unlockedFragments);
  const inventory = useProgressStore((s) => s.inventory);
  const [tab, setTab] = useState<"photos" | "words">("photos");

  const letters = [
    inventory.includes("letter-first") ? findLetter("first-message") : undefined,
    inventory.includes("letter-from-me") ? findLetter("from-me") : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof findLetter>>[];

  return (
    <Modal onClose={close} size="xl" eyebrow={story.summary.subtitle} title={t("memories")} labelledBy="gallery-title">
      <div className="mb-5 flex gap-2">
        {(["photos", "words"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition-colors focus-ring",
              tab === key ? "bg-rose-500/30 text-ink" : "text-ink-faint hover:text-ink",
            )}
          >
            {key === "photos" ? "Foto" : "Kata-kata"}
          </button>
        ))}
      </div>

      {tab === "photos" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {story.memories.map((memory, i) => {
            const seen = viewed.includes(memory.id);
            return (
              <button
                key={memory.id}
                type="button"
                disabled={!seen}
                onClick={() => open({ type: "memory", memoryId: memory.id })}
                className={cn(
                  "group rounded-sm bg-[#fdfaf4] p-2 pb-6 text-left shadow-lg transition-transform focus-ring",
                  seen ? "hover:-translate-y-1 hover:rotate-[-1deg]" : "opacity-40 grayscale",
                )}
                style={{ transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 1.5}deg)` }}
              >
                <div className="relative aspect-square w-full overflow-hidden bg-midnight-800">
                  {seen ? (
                    <Image src={memory.image} alt={memory.title} fill sizes="200px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-midnight-500">
                      <Icon name="photo" size={32} />
                    </div>
                  )}
                </div>
                <p className="mt-2 truncate font-script text-lg text-[#4a3a4f]">{seen ? memory.title : t("notYetViewed")}</p>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {letters.length === 0 && bottles.length === 0 && fragments.length === 0 && (
            <p className="text-sm text-ink-faint">{t("notYetViewed")}</p>
          )}
          {letters.map((letter) => (
            <GalleryRow
              key={letter.id}
              icon="letter"
              title={letter.title}
              excerpt={letter.paragraphs[0]}
              onOpen={() => open({ type: "letter", letterId: letter.id, closable: true })}
            />
          ))}
          {story.bottles
            .filter((b) => bottles.includes(b.id))
            .map((bottle) => (
              <GalleryRow key={bottle.id} icon="bottle" title={bottle.title} excerpt={bottle.text} onOpen={() => open({ type: "bottle", bottleId: bottle.id })} />
            ))}
          {story.fragments
            .filter((f) => fragments.includes(f.id))
            .map((fragment) => (
              <GalleryRow
                key={fragment.id}
                icon="scroll"
                title={fragment.title}
                excerpt={fragment.lines.join(" ")}
                onOpen={() => open({ type: "fragment", fragmentId: fragment.id })}
              />
            ))}
        </div>
      )}
    </Modal>
  );
}

function GalleryRow({ icon, title, excerpt, onOpen }: { icon: "letter" | "bottle" | "scroll"; title: string; excerpt: string; onOpen: () => void }) {
  return (
    <div className="glass-light flex items-center gap-4 rounded-2xl p-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-200">
        <Icon name={icon} size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-lg text-ink">{title}</p>
        <p className="line-clamp-1 text-xs text-ink-muted">{excerpt}</p>
      </div>
      <Button size="sm" variant="secondary" onClick={onOpen}>
        Baca
      </Button>
    </div>
  );
}
