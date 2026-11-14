import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AMBIENT_TRACKS, IMAGES, MUSIC_TRACKS, PARTICLES, SFX, TEXTURES, audioSources } from "@/config/assets";
import { story } from "@/config/story";

const PUBLIC = join(__dirname, "..", "public");
const exists = (url: string) => existsSync(join(PUBLIC, url));

describe("asset manifest", () => {
  it("ships every music, ambience and sfx file in both ogg and mp3", () => {
    const bases = [...Object.values(MUSIC_TRACKS), ...Object.values(AMBIENT_TRACKS), ...Object.values(SFX)];
    const missing = bases.flatMap((base) => audioSources(base)).filter((url) => !exists(url));
    expect(missing).toEqual([]);
  });

  it("ships every particle sprite and texture", () => {
    const missing = [...Object.values(PARTICLES), ...Object.values(TEXTURES), ...Object.values(IMAGES)].filter((url) => !exists(url));
    expect(missing).toEqual([]);
  });

  it("ships an image for every memory", () => {
    const missing = story.memories.map((m) => m.image).filter((url) => !exists(url));
    expect(missing).toEqual([]);
  });
});
