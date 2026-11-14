"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { CATEGORY_LABELS, CATEGORY_ORDER, ITEMS } from "@/game/systems/items";
import { useT } from "@/hooks/useT";
import { useProgressStore } from "@/store/progressStore";
import { useUIStore } from "@/store/uiStore";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import type { InventoryItem, ItemCategory } from "@/types/game";

const TOTALS: Record<ItemCategory, number> = Object.values(ITEMS).reduce(
  (acc, item) => {
    acc[item.category] += 1;
    return acc;
  },
  { light: 0, flower: 0, memory: 0, bottle: 0, star: 0, key: 0, fragment: 0, letter: 0, gift: 0 },
);

export default function InventoryPanel() {
  const t = useT();
  const close = useUIStore((s) => s.closeOverlay);
  const open = useUIStore((s) => s.pushOverlay);
  const inventory = useProgressStore((s) => s.inventory);
  const [selected, setSelected] = useState<InventoryItem | null>(null);

  const groups = useMemo(() => {
    const owned = inventory.map((id) => ITEMS[id]).filter(Boolean);
    return CATEGORY_ORDER.map((category) => ({
      category,
      items: owned.filter((i) => i.category === category),
      total: TOTALS[category],
    })).filter((g) => g.items.length > 0 || g.total > 0);
  }, [inventory]);

  const openRelated = (item: InventoryItem) => {
    if (item.category === "memory") open({ type: "memory", memoryId: item.id });
    else if (item.category === "bottle") open({ type: "bottle", bottleId: item.id });
    else if (item.category === "fragment") open({ type: "fragment", fragmentId: item.id });
    else if (item.id === "letter-first") open({ type: "letter", letterId: "first-message", closable: true });
    else if (item.id === "letter-from-me") open({ type: "letter", letterId: "from-me", closable: true });
  };

  return (
    <Modal onClose={close} eyebrow={`${inventory.length} ${t("itemsCollected").toLowerCase()}`} title={t("inventory")} size="lg" labelledBy="inventory-title">
      <div className="grid gap-6 md:grid-cols-[1fr_16rem]">
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.category}>
              <header className="mb-2 flex items-center justify-between">
                <h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-rose-300/90">{CATEGORY_LABELS[group.category]}</h3>
                <span className="text-xs tabular-nums text-ink-faint">
                  {group.items.length}/{group.total}
                </span>
              </header>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                {group.items.map((item) => (
                  <motion.button
                    key={item.id}
                    type="button"
                    layout
                    onClick={() => setSelected(item)}
                    onDoubleClick={() => openRelated(item)}
                    className={cn(
                      "glass-light flex aspect-square items-center justify-center rounded-2xl transition-all hover:scale-105 focus-ring",
                      selected?.id === item.id && "ring-2 ring-rose-300/70",
                    )}
                    style={{ color: item.color, boxShadow: `inset 0 0 24px ${item.color}22` }}
                    title={item.name}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    <Icon name={item.icon} size={24} />
                  </motion.button>
                ))}
                {Array.from({ length: Math.max(0, group.total - group.items.length) }).map((_, i) => (
                  <div key={`empty-${i}`} className="flex aspect-square items-center justify-center rounded-2xl border border-dashed border-white/10 text-white/10">
                    <Icon name="sparkles" size={16} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
        <aside className="glass-light flex min-h-48 flex-col rounded-2xl p-5">
          {selected ? (
            <>
              <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ color: selected.color, background: `${selected.color}22` }}>
                <Icon name={selected.icon} size={24} />
              </span>
              <p className="mt-3 text-[0.65rem] uppercase tracking-[0.3em] text-ink-faint">{CATEGORY_LABELS[selected.category]}</p>
              <h4 className="mt-1 font-display text-xl text-ink">{selected.name}</h4>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{selected.description}</p>
              {["memory", "bottle", "fragment", "letter"].includes(selected.category) && (
                <button type="button" onClick={() => openRelated(selected)} className="mt-auto pt-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-rose-300 hover:text-rose-200 focus-ring">
                  Buka →
                </button>
              )}
            </>
          ) : (
            <p className="m-auto text-center text-sm text-ink-faint">Pilih item untuk melihat ceritanya.</p>
          )}
        </aside>
      </div>
    </Modal>
  );
}
