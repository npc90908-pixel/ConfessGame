import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CHARACTER_MODELS, MODELS, MODEL_ROOT, MODEL_TEXTURE_KITS } from "@/config/models";
import { buildLayout, layoutModelUrls } from "@/game/scenes/environments/castle/layout";

const PUBLIC = join(__dirname, "..", "public");
const exists = (url: string) => existsSync(join(PUBLIC, url));

// Every glTF binary starts with the ASCII magic "glTF" followed by version 2.
const isGlb = (url: string) => {
  const buf = readFileSync(join(PUBLIC, url));
  return buf.length > 12 && buf.toString("latin1", 0, 4) === "glTF" && buf.readUInt32LE(4) === 2;
};

describe("model manifest", () => {
  it("ships every model referenced from the manifest as a valid .glb", () => {
    const urls = Object.values(MODELS);
    expect(urls.length).toBeGreaterThan(0);
    const missing = urls.filter((url) => !exists(url));
    expect(missing).toEqual([]);
    const corrupt = urls.filter((url) => !isGlb(url));
    expect(corrupt).toEqual([]);
  });

  it("keeps every url under the model root with a unique path", () => {
    const urls = Object.values(MODELS);
    expect(urls.every((url) => url.startsWith(`${MODEL_ROOT}/`) && url.endsWith(".glb"))).toBe(true);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("ships the shared colormap for every kit that needs one", () => {
    const missing = MODEL_TEXTURE_KITS.map((kit) => `${MODEL_ROOT}/${kit}/Textures/colormap.png`).filter((url) => !exists(url));
    expect(missing).toEqual([]);
  });

  it("ships the CC0 licence next to the models", () => {
    expect(exists(`${MODEL_ROOT}/LICENSE.txt`)).toBe(true);
    expect(readFileSync(join(PUBLIC, MODEL_ROOT, "LICENSE.txt"), "utf8")).toMatch(/CC0/i);
  });

  it("maps every playable character to a model in the manifest", () => {
    const urls = new Set<string>(Object.values(MODELS));
    for (const url of Object.values(CHARACTER_MODELS)) expect(urls.has(url)).toBe(true);
  });

  it("only places manifest models in the castle layout", () => {
    const urls = new Set<string>(Object.values(MODELS));
    const used = layoutModelUrls(buildLayout());
    expect(used.length).toBeGreaterThan(0);
    for (const url of used) expect(urls.has(url)).toBe(true);
  });
});
