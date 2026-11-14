import { GameLoader } from "@/components/game/GameLoader";

/**
 * The whole experience is a client-rendered 3D application. This server
 * component only ships the static shell; everything else streams in lazily.
 */
export default function HomePage() {
  return (
    <main id="main" className="fixed inset-0 overflow-hidden bg-midnight-950">
      <GameLoader />
    </main>
  );
}
