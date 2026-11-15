// @vitest-environment jsdom
/**
 * Renders the real HTML layer (title, HUD, every overlay, dialogue, toasts)
 * against the stores in the states the game puts them in, and clicks through
 * the flows that matter: starting a journey, answering the question, closing
 * letters, reading dialogue, pausing.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/game/systems/audio/AudioManager", () => {
  const noop = () => undefined;
  return { audio: new Proxy({}, { get: () => noop }) };
});
vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return { ...actual, sleep: (ms: number) => actual.sleep(Math.min(ms, 20)) };
});
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { fill: _fill, priority: _priority, sizes: _sizes, ...rest } = props;
    void _fill;
    void _priority;
    void _sizes;
    return React.createElement("img", rest as React.ImgHTMLAttributes<HTMLImageElement>);
  },
}));

import { UILayer } from "@/components/game/UILayer";
import { story } from "@/config/story";
import { game } from "@/game/engine/GameManager";
import { makeT } from "@/lib/i18n";
import { useProgressStore } from "@/store/progressStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useUIStore } from "@/store/uiStore";
import type { Overlay } from "@/types/game";

const t = makeT("mix");

beforeAll(() => {
  if (typeof window.matchMedia !== "function") {
    window.matchMedia = () =>
      ({ matches: false, media: "", onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }) as unknown as MediaQueryList;
  }
  if (!("ResizeObserver" in globalThis)) {
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  }
  Element.prototype.scrollIntoView ??= () => undefined;
  useSettingsStore.setState({ language: "mix" });
  useProgressStore.getState().startNewJourney();
});

afterEach(() => {
  cleanup();
  const ui = useUIStore.getState();
  ui.closeAllOverlays();
  ui.skipDialogue();
  ui.setPhase("playing");
});

const setOverlay = (overlay: Overlay) => act(() => useUIStore.getState().openOverlay(overlay));

describe("title screen", () => {
  it("offers a new journey and starts it", async () => {
    act(() => useUIStore.getState().setPhase("title"));
    render(<UILayer />);
    expect(screen.getByRole("heading", { level: 1, name: story.title })).toBeTruthy();
    const start = screen.getByRole("button", { name: new RegExp(t("startJourney"), "i") });
    fireEvent.click(start);
    await waitFor(() => expect(useUIStore.getState().overlay?.type).toBe("intro"));
    expect(useUIStore.getState().phase).toBe("playing");
  });

  it("shows a continue button when there is a save", () => {
    useProgressStore.getState().setCheckpoint("blooming-garden");
    act(() => useUIStore.getState().setPhase("title"));
    render(<UILayer />);
    expect(screen.getByRole("button", { name: new RegExp(t("continueJourney"), "i") })).toBeTruthy();
    useProgressStore.getState().setCheckpoint("awakening");
  });
});

describe("overlays", () => {
  const cases: Array<[string, Overlay, string | RegExp]> = [
    ["intro", { type: "intro" }, /./],
    ["pause", { type: "pause" }, new RegExp(t("resume"), "i")],
    ["settings", { type: "settings", from: "pause" }, /./],
    ["inventory", { type: "inventory" }, /./],
    ["controls (walk)", { type: "controls", mode: "walk" }, /./],
    ["controls (boat)", { type: "controls", mode: "boat" }, /./],
    ["chapter intro", { type: "chapter-intro", chapterId: "ch2" }, story.chapters.ch2.title],
    ["chapter complete", { type: "chapter-complete", chapterId: "ch1" }, /./],
    ["letter", { type: "letter", letterId: story.letters.firstMessage.id }, story.letters.firstMessage.title],
    ["memory", { type: "memory", memoryId: story.memories[0].id }, story.memories[0].title],
    ["gallery", { type: "gallery" }, /./],
    ["bottle", { type: "bottle", bottleId: story.bottles[0].id }, /./],
    ["fragment", { type: "fragment", fragmentId: story.fragments[0].id }, story.fragments[0].title],
    ["puzzle", { type: "puzzle" }, /./],
    ["summary", { type: "summary" }, /./],
    ["proposal", { type: "proposal" }, story.proposal.yesLabel],
    ["ending (yes)", { type: "ending", answer: "yes" }, /./],
    ["ending (not yet)", { type: "ending", answer: "not-yet" }, /./],
  ];

  it.each(cases)("renders the %s overlay", async (_name, overlay, expected) => {
    render(<UILayer />);
    setOverlay(overlay);
    await waitFor(
      () => {
        const matches = typeof expected === "string" ? screen.getAllByText(expected, { exact: false }) : screen.getAllByText(expected);
        expect(matches.length).toBeGreaterThan(0);
      },
      { timeout: 4000 }, // letters open their envelope first
    );
  });

  it("walks every settings tab, changes a value in each and closes back to the pause menu", async () => {
    const settings = useSettingsStore.getState();
    settings.resetToDefaults();
    render(<UILayer />);
    act(() => useUIStore.getState().openOverlay({ type: "pause" }));
    act(() => useUIStore.getState().pushOverlay({ type: "settings", from: "pause" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((b) => b.textContent)).toEqual([t("audio"), t("graphics"), t("gameplay"), t("accessibility"), t("progress")]);

    // audio
    fireEvent.change(screen.getByLabelText(t("ambientVolume")), { target: { value: "0.25" } });
    expect(useSettingsStore.getState().ambientVolume).toBe(0.25);
    // graphics
    fireEvent.click(tabs[1]);
    fireEvent.click(screen.getByRole("button", { name: t("off") }));
    expect(useSettingsStore.getState().shadowQuality).toBe("off");
    fireEvent.change(screen.getByLabelText(t("particleDensity")), { target: { value: "0.5" } });
    expect(useSettingsStore.getState().particleDensity).toBe(0.5);
    fireEvent.click(screen.getByRole("switch", { name: new RegExp(t("postProcessing").slice(0, 10), "i") }));
    expect(useSettingsStore.getState().postProcessing).toBe(false);
    // gameplay
    fireEvent.click(tabs[2]);
    fireEvent.change(screen.getByLabelText(t("movementSensitivity")), { target: { value: "1.3" } });
    expect(useSettingsStore.getState().movementSensitivity).toBe(1.3);
    fireEvent.click(screen.getByRole("switch", { name: new RegExp(t("showHud").slice(0, 8), "i") }));
    expect(useSettingsStore.getState().showHud).toBe(false);
    // accessibility
    fireEvent.click(tabs[3]);
    fireEvent.click(screen.getByRole("button", { name: t("textLarge") }));
    expect(useSettingsStore.getState().textSize).toBe("large");
    fireEvent.change(screen.getByLabelText(t("animationIntensity")), { target: { value: "0.5" } });
    expect(useSettingsStore.getState().animationIntensity).toBe(0.5);
    // progress → restore defaults
    fireEvent.click(tabs[4]);
    fireEvent.click(screen.getByRole("button", { name: t("restoreDefaults") }));
    expect(useSettingsStore.getState().textSize).toBe("medium");
    expect(useSettingsStore.getState().showHud).toBe(true);
    // close → back on the pause menu
    fireEvent.click(screen.getByRole("button", { name: t("close") }));
    await waitFor(() => expect(useUIStore.getState().overlay?.type).toBe("pause"));
    useSettingsStore.setState({ language: "mix" });
  });

  it("closes a closable letter from its close button", async () => {
    render(<UILayer />);
    setOverlay({ type: "letter", letterId: story.letters.firstMessage.id, closable: true });
    const close = await screen.findByRole("button", { name: t("close") }, { timeout: 4000 });
    fireEvent.click(close);
    await waitFor(() => expect(useUIStore.getState().overlay).toBeNull());
  });

  it("records the answer from the proposal screen", async () => {
    useProgressStore.getState().setScene("the-question");
    render(<UILayer />);
    setOverlay({ type: "proposal" });
    const yes = await screen.findByRole("button", { name: story.proposal.yesLabel });
    const spy = vi.spyOn(game, "answer").mockResolvedValue(undefined);
    fireEvent.click(yes);
    await waitFor(() => expect(spy).toHaveBeenCalledWith("yes"));
    spy.mockRestore();
  });

  it("renders every memory in the gallery", async () => {
    story.memories.forEach((m) => useProgressStore.getState().markMemoryViewed(m.id));
    render(<UILayer />);
    setOverlay({ type: "gallery" });
    for (const memory of story.memories) {
      await waitFor(() => expect(screen.getAllByText(memory.title, { exact: false }).length).toBeGreaterThan(0));
    }
  });
});

describe("dialogue and HUD", () => {
  it("steps through dialogue lines and resolves the promise", async () => {
    render(<UILayer />);
    const lines = story.dialogue.strangePlace;
    const done = vi.fn();
    act(() => {
      void game.say(lines).then(done);
    });
    await waitFor(() => expect(useUIStore.getState().dialogue).not.toBeNull());
    for (let i = 0; i < lines.length; i++) {
      act(() => useUIStore.getState().advanceDialogue());
    }
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(useUIStore.getState().dialogue).toBeNull();
  });

  it("shows the current objective and toasts", async () => {
    useProgressStore.getState().setScene("little-things");
    render(<UILayer />);
    await waitFor(() => expect(screen.getAllByText(/Temukan bunga istimewa/i).length).toBeGreaterThan(0));
    act(() => useUIStore.getState().pushToast({ title: "Bunga pertama", description: "Masih wangi.", icon: "flower", color: "#ff8fb8" }));
    expect(await screen.findByText("Bunga pertama")).toBeTruthy();
  });

  it("opens the pause menu and resumes", async () => {
    render(<UILayer />);
    act(() => game.pause());
    await screen.findByRole("button", { name: new RegExp(t("resume"), "i") });
    fireEvent.click(screen.getByRole("button", { name: new RegExp(t("resume"), "i") }));
    await waitFor(() => expect(useUIStore.getState().overlay).toBeNull());
  });
});
