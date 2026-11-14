"use client";

import { AnimatePresence } from "framer-motion";
import { lazy, Suspense } from "react";
import { useUIStore } from "@/store/uiStore";
import { CinematicOverlay } from "./CinematicOverlay";
import { Hud } from "./Hud";
import { LoadingScreen } from "./LoadingScreen";
import { TitleScreen } from "./TitleScreen";
import { TransitionScreen, Veil } from "./Veil";
import { DialogueBox } from "@/components/story/DialogueBox";
import { Toasts } from "./Toasts";

// Overlays are rarely all needed; keep the heavier ones in their own chunks.
const PauseMenu = lazy(() => import("./PauseMenu"));
const SettingsPanel = lazy(() => import("./SettingsPanel"));
const InventoryPanel = lazy(() => import("./InventoryPanel"));
const ControlsOverlay = lazy(() => import("./ControlsOverlay"));
const ChapterIntro = lazy(() => import("./ChapterIntro"));
const ChapterComplete = lazy(() => import("./ChapterComplete"));
const IntroSequence = lazy(() => import("@/components/story/IntroSequence"));
const LetterOverlay = lazy(() => import("@/components/story/LetterOverlay"));
const MemoryModal = lazy(() => import("@/components/story/MemoryModal"));
const MemoryGallery = lazy(() => import("@/components/story/MemoryGallery"));
const BottleOverlay = lazy(() => import("@/components/story/BottleOverlay"));
const FragmentOverlay = lazy(() => import("@/components/story/FragmentOverlay"));
const StarPuzzle = lazy(() => import("@/components/story/StarPuzzle"));
const SummaryOverlay = lazy(() => import("@/components/story/SummaryOverlay"));
const ProposalScreen = lazy(() => import("@/components/story/ProposalScreen"));
const EndingScreen = lazy(() => import("@/components/story/EndingScreen"));

function OverlaySwitch() {
  const overlay = useUIStore((s) => s.overlay);
  if (!overlay) return null;
  switch (overlay.type) {
    case "intro":
      return <IntroSequence key="intro" />;
    case "pause":
      return <PauseMenu key="pause" />;
    case "settings":
      return <SettingsPanel key="settings" from={overlay.from} />;
    case "inventory":
      return <InventoryPanel key="inventory" />;
    case "controls":
      return <ControlsOverlay key="controls" mode={overlay.mode} />;
    case "chapter-intro":
      return <ChapterIntro key={`intro-${overlay.chapterId}`} chapterId={overlay.chapterId} />;
    case "chapter-complete":
      return <ChapterComplete key={`complete-${overlay.chapterId}`} chapterId={overlay.chapterId} />;
    case "letter":
      return <LetterOverlay key={`letter-${overlay.letterId}`} letterId={overlay.letterId} closable={overlay.closable ?? true} />;
    case "memory":
      return <MemoryModal key={`memory-${overlay.memoryId}`} memoryId={overlay.memoryId} />;
    case "gallery":
      return <MemoryGallery key="gallery" />;
    case "bottle":
      return <BottleOverlay key={`bottle-${overlay.bottleId}`} bottleId={overlay.bottleId} />;
    case "fragment":
      return <FragmentOverlay key={`fragment-${overlay.fragmentId}`} fragmentId={overlay.fragmentId} />;
    case "puzzle":
      return <StarPuzzle key="puzzle" />;
    case "summary":
      return <SummaryOverlay key="summary" />;
    case "proposal":
      return <ProposalScreen key="proposal" />;
    case "ending":
      return <EndingScreen key={`ending-${overlay.answer}`} answer={overlay.answer} />;
    default:
      return null;
  }
}

/** Everything that is HTML, layered above the canvas. */
export function UILayer() {
  const phase = useUIStore((s) => s.phase);
  return (
    // Empty areas let pointer events through to the canvas (camera drag);
    // every interactive child opts back in with `pointer-events-auto`.
    <div className="pointer-events-none absolute inset-0 z-10 select-none">
      <Veil />
      {phase === "playing" && <Hud />}
      <CinematicOverlay />
      <Toasts />
      <AnimatePresence mode="wait">
        <Suspense fallback={null}>
          <OverlaySwitch />
        </Suspense>
      </AnimatePresence>
      <DialogueBox />
      <TransitionScreen />
      <AnimatePresence>{phase === "title" && <TitleScreen key="title" />}</AnimatePresence>
      <AnimatePresence>{phase === "boot" && <LoadingScreen key="loading" />}</AnimatePresence>
    </div>
  );
}
