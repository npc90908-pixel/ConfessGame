// @vitest-environment jsdom
/**
 * Plays the expanded Garden of Memories by actually WALKING: in through the
 * gate, over the stream on the footbridge, up onto the pavilion plateau,
 * out to all five flowers across the meadows and the hill, into the hidden
 * hedge nook and up the knoll — only ever interacting through the prompt.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/game/systems/audio/AudioManager", () => {
  const noop = () => undefined;
  return { audio: new Proxy({}, { get: () => noop }) };
});
vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return { ...actual, sleep: (ms: number) => actual.sleep(Math.min(ms, 40)) };
});
vi.mock("@react-three/drei", () => import("../helpers/drei").then((m) => m.mockDrei()));

import { runtime } from "@/game/engine/runtime";
import { getWorld } from "@/game/engine/world";
import { GARDEN } from "@/game/scenes/landmarks";
import { BRIDGES, NOOK_CENTER, NOOK_ENTRANCES, STREAM, getHeight, inWater, streamCenterZ } from "@/game/scenes/environments/garden/terrain";
import { useProgressStore } from "@/store/progressStore";
import { frames, mountOnFoot, pressInteract, unmountOnFoot, until, untilIdle, waitForScene, walkTo } from "../helpers/walk";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = false;

beforeAll(async () => {
  const { default: MemoryGarden } = await import("@/game/scenes/environments/MemoryGarden");
  await mountOnFoot("memory-garden", "blooming-garden", MemoryGarden);
});

afterAll(async () => {
  await unmountOnFoot();
});

describe("Chapter 2 on foot", () => {
  it("the walk surface is continuous: plateau, mound and bridge decks are part of the height field", () => {
    const world = getWorld()!;
    // Pavilion plateau is raised and flat where the player stands.
    expect(world.getHeight(0, 0)).toBeCloseTo(0.45, 1);
    expect(world.getHeight(2.5, 1.5)).toBeCloseTo(0.45, 1);
    // Memory Tree mound.
    expect(world.getHeight(GARDEN.treeOffer[0], GARDEN.treeOffer[2])).toBeCloseTo(0.7, 1);
    // Bridge decks sit above both banks; the stream bed is carved below them.
    for (const b of BRIDGES) {
      const zc = streamCenterZ(b.x);
      const deck = world.getHeight(b.x, zc);
      expect(deck).toBeGreaterThan(world.getHeight(b.x, zc - b.halfLength - 1));
      expect(deck).toBeGreaterThan(world.getHeight(b.x, zc + b.halfLength + 1));
      expect(world.getHeight(b.x + b.halfWidth + 1.5, zc)).toBeLessThan(deck - STREAM.depth * 0.8);
    }
    // Nothing is NaN anywhere inside the hedges.
    for (let x = -44; x <= 44; x += 4) for (let z = -44; z <= 44; z += 4) expect(Number.isFinite(world.getHeight(x, z))).toBe(true);
  });

  it("spawns at the south gate facing the garden and crosses the footbridge onto the pavilion", async () => {
    const p = runtime.player;
    expect(p.mode).toBe("walk");
    expect(p.position.z).toBeCloseTo(GARDEN.spawn[2], 0);
    const zc = streamCenterZ(0);
    let onDeck = 0;
    let wet = 0;
    const left = await walkTo([0, 0, zc], {
      reach: 0.6,
      seconds: 30,
      onFrame: () => {
        if (Math.abs(p.position.z - zc) < 1.2 && p.grounded) {
          onDeck += 1;
          if (p.position.y < getHeight(0, zc) - 0.05) wet += 1;
        }
      },
    });
    expect(left).toBeLessThanOrEqual(0.6);
    // Standing mid-bridge: feet on the deck, not in the water.
    expect(p.position.y).toBeCloseTo(getHeight(0, zc), 1);
    expect(inWater(p.position.x, p.position.z)).toBe(true);
    expect(onDeck).toBeGreaterThan(0);
    expect(wet).toBe(0);

    const reached = await walkTo(GARDEN.pavilion, { reach: 1.5, seconds: 40 });
    expect(reached).toBeLessThanOrEqual(1.5);
    expect(p.position.y).toBeCloseTo(0.45, 1);
    await waitForScene("little-things");
    await untilIdle();
  });

  it("collects the five flowers across the meadows, the lawns and the hill, using only the prompt", async () => {
    const zcW = streamCenterZ(-24);
    const zcE = streamCenterZ(26);
    const routes: Array<Array<readonly [number, number, number]>> = [
      [GARDEN.flowers[0]], // west meadow
      [GARDEN.flowers[1]], // east meadow
      [GARDEN.flowers[2]], // towards the grove
      [[26, 0, zcE - 5], [26, 0, zcE + 5], GARDEN.flowers[3]], // east bridge → SE lawn
      [[-24, 0, zcW + 5], [-24, 0, zcW - 5], [-24, 0, zcW + 5], GARDEN.flowers[4]], // west bridge → SW hill
    ];
    for (let i = 0; i < 5; i++) {
      for (const wp of routes[i]) {
        const left = await walkTo(wp, { reach: 1.6, seconds: 60 });
        expect(left, `reach ${wp} for flower-${i + 1}`).toBeLessThanOrEqual(1.6);
      }
      await pressInteract(`flower-${i + 1}`);
      await until(() => useProgressStore.getState().inventory.includes(`flower-${i + 1}`), `flower-${i + 1} collected`);
      await untilIdle();
    }
    // The fifth flower sits on top of the hill: the player really climbed.
    expect(runtime.player.position.y).toBeGreaterThan(0.9);
    await waitForScene("memory-in-the-air");
    await untilIdle();
  });

  it("finds the keepsake hidden in the hedge nook", async () => {
    const [ex, , ez] = NOOK_ENTRANCES[0];
    for (const wp of [[ex - 2.5, 0, ez] as const, [ex + 2.5, 0, ez] as const, NOOK_CENTER]) {
      const left = await walkTo(wp, { reach: 1.4, seconds: 60 });
      expect(left, `reach ${wp}`).toBeLessThanOrEqual(1.4);
    }
    await pressInteract("keepsake-ch2-nook");
    await until(() => useProgressStore.getState().inventory.includes("keepsake-ch2-nook"), "keepsake collected");
    await untilIdle();
  });

  it("quiet places speak once: the knoll and the willow grove", async () => {
    const zcE = streamCenterZ(26);
    const [ex, , ez] = NOOK_ENTRANCES[0];
    for (const wp of [[ex + 2.5, 0, ez] as const, [ex - 2.5, 0, ez] as const, [26, 0, zcE + 5] as const, [26, 0, zcE - 5] as const, GARDEN.memorySpots.knoll]) {
      const left = await walkTo(wp, { reach: 2.5, seconds: 60 });
      expect(left, `reach ${wp}`).toBeLessThanOrEqual(2.5);
    }
    await until(() => useProgressStore.getState().flags["spot:garden-knoll"] === true, "knoll line played");
    expect(runtime.player.position.y).toBeGreaterThan(0.8);
    await untilIdle();
    const left = await walkTo(GARDEN.memorySpots.grove, { reach: 2.5, seconds: 90 });
    expect(left).toBeLessThanOrEqual(2.5);
    await until(() => useProgressStore.getState().flags["spot:garden-grove"] === true, "grove line played");
    await untilIdle();
    await frames(4);
  });
});
