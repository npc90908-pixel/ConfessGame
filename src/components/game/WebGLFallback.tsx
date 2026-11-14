"use client";

import Image from "next/image";
import { useState } from "react";
import { story } from "@/config/story";
import { IMAGES } from "@/config/assets";
import { useT } from "@/hooks/useT";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/**
 * Reader mode for devices without WebGL. The story is still fully readable:
 * every chapter, letter, memory caption and the question itself — with both
 * answers acknowledged gently (no state is required here).
 */
export function WebGLFallback() {
  const t = useT();
  const [answer, setAnswer] = useState<"yes" | "not-yet" | null>(null);
  const chapters = Object.values(story.chapters);
  const letters = [story.letters.firstMessage, story.letters.fromMe];

  return (
    <div className="selectable scrollbar-elegant absolute inset-0 overflow-y-auto bg-midnight-950 text-ink">
      <div className="mx-auto max-w-2xl px-6 py-16 md:py-24">
        <header className="text-center">
          <div className="relative mx-auto mb-8 aspect-[16/10] w-full max-w-md overflow-hidden rounded-3xl">
            <Image src={IMAGES.keyVisual} alt="" fill sizes="448px" className="object-cover" priority />
          </div>
          <p className="text-[0.7rem] uppercase tracking-[0.45em] text-rose-300">{t("webglTitle")}</p>
          <h1 className="mt-3 font-display text-5xl text-ink">{story.title}</h1>
          <p className="mt-3 font-display text-xl italic text-lavender-200">“{story.tagline}”</p>
          <p className="glass mt-6 rounded-2xl p-4 text-sm text-ink-muted">{t("webglBody")}</p>
        </header>

        {chapters.map((chapter) => (
          <section key={chapter.id} className="mt-16">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.4em]" style={{ color: chapter.accent }}>
              {t("chapter")} {String(chapter.number).padStart(2, "0")}
            </p>
            <h2 className="mt-1 font-display text-3xl">{chapter.title}</h2>
            <p className="font-display text-lg italic text-lavender-200">{chapter.subtitle}</p>
            <p className="mt-4 leading-relaxed text-ink-muted">{chapter.intro}</p>
            {chapter.id === "ch1" && <LetterBlock letter={letters[0]} />}
            {chapter.id === "ch2" && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {story.memories.map((memory) => (
                  <figure key={memory.id} className="rounded-sm bg-[#fdfaf4] p-2 pb-4 text-[#4a3a4f]">
                    <div className="relative aspect-square overflow-hidden">
                      <Image src={memory.image} alt={memory.title} fill sizes="300px" className="object-cover" />
                    </div>
                    <figcaption className="mt-2 px-1">
                      <p className="font-script text-xl">{memory.title}</p>
                      <p className="text-xs">{memory.caption}</p>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
            {chapter.id === "ch3" && (
              <div className="mt-6 space-y-3">
                {story.bottles.map((bottle) => (
                  <div key={bottle.id} className="glass rounded-2xl p-4">
                    <p className="text-[0.65rem] uppercase tracking-[0.3em] text-ink-faint">{bottle.title}</p>
                    <p className="mt-1 font-display text-lg">{bottle.text}</p>
                  </div>
                ))}
              </div>
            )}
            {chapter.id === "ch4" && (
              <>
                <div className="mt-6 space-y-3">
                  {story.fragments.map((fragment) => (
                    <div key={fragment.id} className="glass rounded-2xl p-4">
                      <p className="text-[0.65rem] uppercase tracking-[0.3em] text-ink-faint">{fragment.title}</p>
                      {fragment.lines.map((line, i) => (
                        <p key={i} className="mt-1 font-display text-lg">
                          {line}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
                <LetterBlock letter={letters[1]} />
              </>
            )}
            <p className="mt-6 font-display text-lg italic text-lavender-200">“{chapter.outro}”</p>
          </section>
        ))}

        <section className="mt-20 text-center">
          <p className="text-[0.7rem] uppercase tracking-[0.5em] text-rose-300">{story.recipientName},</p>
          <h2 className="mt-4 font-display text-4xl md:text-5xl">{story.proposal.question}</h2>
          <p className="mt-4 font-display text-xl italic text-lavender-200">{story.proposal.supportingText}</p>
          {answer === null ? (
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button variant="primary" size="xl" onClick={() => setAnswer("yes")}>
                {story.proposal.yesLabel}
              </Button>
              <Button variant="secondary" size="xl" onClick={() => setAnswer("not-yet")}>
                {story.proposal.notYetLabel}
              </Button>
            </div>
          ) : (
            <div className={cn("glass mt-8 rounded-3xl p-6 text-left")}>
              <h3 className="font-display text-2xl">{answer === "yes" ? story.endings.yes.headline : story.endings.notYet.headline}</h3>
              <p className="mt-2 text-ink-muted">{answer === "yes" ? story.endings.yes.message : story.endings.notYet.message}</p>
              <LetterBlock letter={answer === "yes" ? story.letters.yesClosing : story.letters.notYetClosing} />
            </div>
          )}
        </section>
        <footer className="mt-16 flex items-center justify-center gap-2 text-xs text-ink-faint">
          <Icon name="heart" size={12} /> {story.senderName}
        </footer>
      </div>
    </div>
  );
}

function LetterBlock({ letter }: { letter: (typeof story.letters)["firstMessage"] }) {
  return (
    <article className="paper mt-6 rounded-2xl px-6 py-8 text-[#3a2a3f] md:px-10">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-rose-600/80">{letter.title}</p>
      {letter.greeting && <p className="mt-3 font-script text-3xl text-[#5a3a5f]">{letter.greeting}</p>}
      <div className="mt-4 space-y-4 font-display text-lg leading-relaxed">
        {letter.paragraphs.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
      {letter.signature && <p className="mt-6 whitespace-pre-line text-right font-script text-2xl text-[#5a3a5f]">{letter.signature}</p>}
    </article>
  );
}
