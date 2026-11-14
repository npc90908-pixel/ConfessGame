import { story } from "@/config/story";

/** Zero-dependency splash shown while the JavaScript bundle streams in. */
export function BootSplash({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-midnight-950 text-ink">
      <div className="relative mb-8 h-16 w-16">
        <div className="absolute inset-0 animate-ping rounded-full bg-rose-500/20 motion-safe-only" />
        <div className="absolute inset-3 rounded-full bg-gradient-to-br from-rose-400 to-lavender-400 opacity-80 blur-sm" />
        <div className="absolute inset-5 rounded-full bg-gold-200" />
      </div>
      <p className="font-display text-2xl italic text-lavender-200">{story.title}</p>
      <p className="mt-3 text-xs uppercase tracking-[0.35em] text-ink-faint">{message ?? "loading"}</p>
    </div>
  );
}
