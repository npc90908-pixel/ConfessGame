"use client";

import dynamic from "next/dynamic";
import { BootSplash } from "./BootSplash";

// The 3D runtime (three.js, R3F, GSAP, Howler) is only ever loaded in the
// browser. Server rendering is skipped entirely for the game tree.
const GameRoot = dynamic(() => import("./GameRoot"), {
  ssr: false,
  loading: () => <BootSplash />,
});

export function GameLoader() {
  return <GameRoot />;
}
