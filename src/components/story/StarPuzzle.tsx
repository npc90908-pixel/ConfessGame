"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { story } from "@/config/story";
import { game } from "@/game/engine/GameManager";
import { audio } from "@/game/systems/audio/AudioManager";
import { useT } from "@/hooks/useT";
import { useProgressStore } from "@/store/progressStore";
import { useUIStore } from "@/store/uiStore";
import { Button, IconButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { createRng } from "@/lib/math";
import { cn } from "@/lib/utils";

interface Star {
  id: number;
  x: number;
  y: number;
  r: number;
}

/**
 * Heart constellation. Coordinates are in a 100×100 box; the order defines
 * the correct path (closed loop).
 */
const HEART: Array<[number, number]> = [
  [50, 86],
  [26, 62],
  [16, 42],
  [22, 26],
  [36, 20],
  [50, 32],
  [64, 20],
  [78, 26],
  [84, 42],
  [74, 62],
];

const STAR_FRAGMENTS = ["star-fragment-1", "star-fragment-2", "star-fragment-3"];

function edgeKey(a: number, b: number) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/**
 * Scene 14 — constellation puzzle. Connect the stars in order to draw the
 * heart. Wrong connections flash red and are rejected; the difficulty in
 * story.ts controls hints and decoys. Fully keyboard accessible.
 */
export default function StarPuzzle() {
  const t = useT();
  const difficulty = story.puzzleDifficulty;
  const close = useUIStore((s) => s.closeOverlay);
  const puzzleState = useProgressStore((s) => s.puzzleState);
  const setPuzzleState = useProgressStore((s) => s.setPuzzleState);

  const stars = useMemo<Star[]>(() => {
    const rng = createRng(7);
    const main = HEART.map(([x, y], i) => ({ id: i, x, y, r: 1.6 + rng.range(0, 0.5) }));
    const decoyCount = difficulty === "easy" ? 0 : difficulty === "normal" ? 4 : 8;
    const decoys: Star[] = [];
    let attempts = 0;
    while (decoys.length < decoyCount && attempts < 200) {
      attempts += 1;
      const x = rng.range(8, 92);
      const y = rng.range(8, 92);
      const tooClose = [...main, ...decoys].some((s) => Math.hypot(s.x - x, s.y - y) < 11);
      if (!tooClose) decoys.push({ id: main.length + decoys.length, x, y, r: 1 + rng.range(0, 0.4) });
    }
    return [...main, ...decoys];
  }, [difficulty]);

  const targetEdges = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < HEART.length; i++) set.add(edgeKey(i, (i + 1) % HEART.length));
    return set;
  }, []);

  const [edges, setEdges] = useState<string[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const [solved, setSolved] = useState(puzzleState === "solved");
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [mistakes, setMistakes] = useState(0);

  useEffect(() => {
    if (puzzleState === "locked") setPuzzleState("active");
  }, [puzzleState, setPuzzleState]);

  const progress = edges.length / targetEdges.size;
  const nextStar = useMemo(() => {
    // Suggest the next star for hints: follow the chain from the last placed edge.
    if (edges.length === 0) return 0;
    const last = edges[edges.length - 1].split("-").map(Number);
    return last.find((id) => !edges.some((e) => e !== edges[edges.length - 1] && e.split("-").map(Number).includes(id))) ?? null;
  }, [edges]);

  const finish = useCallback(() => {
    setSolved(true);
    setPuzzleState("solved");
    audio.sfx("puzzle-complete");
    STAR_FRAGMENTS.forEach((id, i) => window.setTimeout(() => game.collect(id, { sfx: "star-connect", toast: i === 2 }), 400 + i * 250));
  }, [setPuzzleState]);

  const connect = useCallback(
    (a: number, b: number) => {
      if (a === b) return;
      const key = edgeKey(a, b);
      if (edges.includes(key)) return;
      if (targetEdges.has(key)) {
        audio.sfx("star-connect", { rate: 0.9 + edges.length * 0.04 });
        const next = [...edges, key];
        setEdges(next);
        setSelected(b);
        if (next.length === targetEdges.size) window.setTimeout(finish, 400);
      } else {
        setMistakes((m) => m + 1);
        audio.sfx("ui-close", { volume: 0.5, rate: 0.7 });
        setWrong(key);
        window.setTimeout(() => setWrong(null), 500);
        setSelected(null);
      }
    },
    [edges, targetEdges, finish],
  );

  const onStar = (id: number) => {
    if (solved) return;
    if (selected === null) {
      setSelected(id);
      audio.sfx("ui-hover", { volume: 0.4 });
      return;
    }
    connect(selected, id);
  };

  const reset = () => {
    setEdges([]);
    setSelected(null);
    audio.sfx("ui-click");
  };

  const toLocal = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return { x: ((clientX - rect.left) / rect.width) * 100, y: ((clientY - rect.top) / rect.height) * 100 };
  };

  const showHints = difficulty === "easy" || (difficulty === "normal" && mistakes >= 3);
  const wrongPoints = wrong ? wrong.split("-").map((n) => stars[Number(n)]) : null;

  return (
    <motion.div
      className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-midnight-950/70 p-3 backdrop-blur-sm sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={t("connectStars")}
    >
      <div className="glass relative flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl md:flex-row">
        <div className="relative aspect-square w-full shrink-0 md:w-[min(60vh,32rem)]">
          <svg
            ref={svgRef}
            viewBox="0 0 100 100"
            className="h-full w-full touch-none"
            onPointerMove={(e) => selected !== null && setPointer(toLocal(e.clientX, e.clientY))}
            onPointerLeave={() => setPointer(null)}
          >
            <defs>
              <radialGradient id="star-glow">
                <stop offset="0%" stopColor="#fff7dd" stopOpacity="1" />
                <stop offset="100%" stopColor="#fff1c9" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="line-grad" x1="0" x2="1">
                <stop offset="0%" stopColor="#ffd6e7" />
                <stop offset="100%" stopColor="#b9a7ff" />
              </linearGradient>
            </defs>
            {/* hint path */}
            {showHints && !solved && (
              <polygon points={HEART.map((p) => p.join(",")).join(" ")} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" strokeDasharray="1.2 1.6" />
            )}
            {/* completed edges */}
            {edges.map((key) => {
              const [a, b] = key.split("-").map(Number);
              return (
                <motion.line
                  key={key}
                  x1={stars[a].x}
                  y1={stars[a].y}
                  x2={stars[b].x}
                  y2={stars[b].y}
                  stroke="url(#line-grad)"
                  strokeWidth={solved ? 0.9 : 0.6}
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  style={{ filter: "drop-shadow(0 0 1.2px #fff1c9)" }}
                />
              );
            })}
            {/* wrong attempt */}
            <AnimatePresence>
              {wrongPoints && (
                <motion.line
                  key={wrong}
                  x1={wrongPoints[0].x}
                  y1={wrongPoints[0].y}
                  x2={wrongPoints[1].x}
                  y2={wrongPoints[1].y}
                  stroke="#ff6b7a"
                  strokeWidth={0.6}
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                />
              )}
            </AnimatePresence>
            {/* rubber band */}
            {selected !== null && pointer && !solved && (
              <line x1={stars[selected].x} y1={stars[selected].y} x2={pointer.x} y2={pointer.y} stroke="rgba(255,255,255,0.35)" strokeWidth={0.4} strokeDasharray="1 1" />
            )}
            {/* solved heart fill */}
            {solved && (
              <motion.polygon
                points={HEART.map((p) => p.join(",")).join(" ")}
                fill="url(#line-grad)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.18 }}
                transition={{ duration: 1.5 }}
              />
            )}
            {/* stars */}
            {stars.map((star) => {
              const isMain = star.id < HEART.length;
              const used = edges.some((e) => e.split("-").map(Number).includes(star.id));
              const isSelected = selected === star.id;
              const isNext = showHints && !solved && nextStar === star.id;
              return (
                <g key={star.id} className="cursor-pointer" onClick={() => onStar(star.id)}>
                  <circle cx={star.x} cy={star.y} r={star.r * 3.2} fill="url(#star-glow)" opacity={isMain ? (used || isSelected ? 0.9 : 0.45) : 0.25} />
                  <motion.circle
                    cx={star.x}
                    cy={star.y}
                    r={star.r}
                    fill={isMain ? "#fff7dd" : "#cfd3e6"}
                    animate={isSelected ? { r: star.r * 1.5 } : isNext ? { r: [star.r, star.r * 1.4, star.r] } : { r: star.r }}
                    transition={isNext ? { duration: 1.2, repeat: Infinity } : { duration: 0.2 }}
                  />
                  {/* keyboard target */}
                  <circle
                    cx={star.x}
                    cy={star.y}
                    r={5}
                    fill="transparent"
                    tabIndex={solved ? -1 : 0}
                    role="button"
                    aria-label={`Star ${star.id + 1}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onStar(star.id);
                      }
                    }}
                    className="focus:outline-none [&:focus-visible]:stroke-rose-300 [&:focus-visible]:stroke-[0.5]"
                  />
                  {difficulty === "easy" && isMain && !solved && (
                    <text x={star.x} y={star.y - 3.4} textAnchor="middle" fontSize="2.6" fill="rgba(255,255,255,0.55)">
                      {star.id + 1}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <div className="flex min-h-0 flex-1 flex-col p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.35em] text-rose-300/90">{t("constellationOf")}</p>
              <h2 className="mt-1 font-display text-3xl text-ink">{t("connectStars")}</h2>
            </div>
            {!solved && <IconButton icon="close" label={t("close")} onClick={close} />}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">{t("puzzleHint")}</p>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full bg-gradient-to-r from-rose-300 to-lavender-300" animate={{ width: `${progress * 100}%` }} />
            </div>
            <span className="text-xs tabular-nums text-ink-faint">
              {edges.length}/{targetEdges.size}
            </span>
          </div>

          <AnimatePresence mode="wait">
            {solved ? (
              <motion.div key="solved" className="mt-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-3 rounded-2xl bg-gold-300/10 p-4 text-gold-200">
                  <Icon name="star" size={22} />
                  <p className="font-display text-xl">{story.dialogue.starPuzzleSolved[0]?.text}</p>
                </div>
                <Button variant="primary" size="lg" iconRight="arrow-right" className="mt-6 w-full" onClick={close}>
                  {t("continue")}
                </Button>
              </motion.div>
            ) : (
              <motion.div key="playing" className="mt-auto flex flex-wrap gap-2 pt-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Button variant="secondary" size="sm" icon="replay" onClick={reset} disabled={edges.length === 0}>
                  {t("resetLines")}
                </Button>
                <span className={cn("ml-auto self-center text-xs text-ink-faint", selected !== null && "text-rose-200")}>
                  {selected !== null ? "→ pilih bintang berikutnya" : "pilih bintang pertama"}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
