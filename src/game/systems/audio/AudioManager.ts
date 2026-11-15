"use client";

import { Howl, Howler } from "howler";
import { AMBIENT_TRACKS, MUSIC_TRACKS, SFX, audioSources, type MusicTrackId } from "@/config/assets";
import { story } from "@/config/story";
import { useSettingsStore } from "@/store/settingsStore";
import type { AmbientKey, MusicKey, SfxKey } from "@/types/game";
import { isBrowser } from "@/lib/utils";

interface Channel {
  key: string;
  howl: Howl;
  id: number;
  /** Base level (0–1) before the settings volumes are applied. */
  level: number;
}

interface SfxOptions {
  volume?: number;
  rate?: number;
}

const MUSIC_FADE = 1800;
const AMBIENT_FADE = 2500;

/**
 * Centralised audio manager built on Howler.
 *
 * – One music channel with cross-fades between chapter themes.
 * – One ambient channel for environment beds.
 * – Pooled one-shot SFX plus named loops (portal hum, heartbeat, boat).
 * – Volumes/mute follow the settings store automatically.
 * – Respects autoplay rules: nothing plays before `unlock()` has been called
 *   from a user gesture (the START JOURNEY button).
 */
class AudioManager {
  private music: Channel | null = null;
  private ambient: Channel | null = null;
  private sfxPool = new Map<SfxKey, Howl>();
  private loops = new Map<SfxKey, Channel>();
  private initialised = false;
  private unlocked = false;
  private musicVolume = 0.7;
  private sfxVolume = 0.9;
  private ambientVolume = 0.7;
  private masterVolume = 0.8;
  private muted = false;
  private pendingMusic: MusicKey | null = null;
  private pendingAmbient: AmbientKey | null = null;
  private lastSfxAt = new Map<SfxKey, number>();

  /** Subscribe to settings. Safe to call multiple times. */
  init() {
    if (this.initialised || !isBrowser) return;
    this.initialised = true;
    Howler.autoUnlock = true;
    Howler.html5PoolSize = 4;
    const apply = () => {
      const s = useSettingsStore.getState();
      this.masterVolume = s.masterVolume;
      this.musicVolume = s.musicVolume;
      this.sfxVolume = s.sfxVolume;
      this.ambientVolume = s.ambientVolume;
      this.muted = s.muted;
      Howler.mute(this.muted);
      Howler.volume(this.masterVolume);
      if (this.music) this.music.howl.volume(this.musicVolume * this.music.level, this.music.id);
      if (this.ambient) this.ambient.howl.volume(this.ambientLevel(), this.ambient.id);
      // Loops keep their own level (boat speed, portal distance…) — only the setting changes.
      for (const loop of this.loops.values()) loop.howl.volume(loop.level * this.sfxVolume, loop.id);
    };
    apply();
    useSettingsStore.subscribe(apply);

    // Pause music when the tab is hidden to save battery; resume on return.
    document.addEventListener("visibilitychange", () => {
      if (!this.unlocked) return;
      if (document.hidden) {
        Howler.mute(true);
      } else {
        Howler.mute(this.muted);
      }
    });
  }

  /** Must be called from a user gesture before any sound can play. */
  unlock() {
    if (!isBrowser) return;
    this.init();
    this.unlocked = true;
    try {
      const ctx = Howler.ctx;
      if (ctx && ctx.state !== "running") void ctx.resume();
    } catch {
      /* ignore — html5 fallback */
    }
    if (this.pendingMusic) {
      const key = this.pendingMusic;
      this.pendingMusic = null;
      this.playMusic(key);
    }
    if (this.pendingAmbient) {
      const key = this.pendingAmbient;
      this.pendingAmbient = null;
      this.playAmbient(key);
    }
  }

  get isUnlocked() {
    return this.unlocked;
  }

  /* ------------------------------------------------------------------ */
  /*  Music                                                             */
  /* ------------------------------------------------------------------ */

  playMusic(key: MusicKey, fade = MUSIC_FADE) {
    if (!isBrowser) return;
    if (!this.unlocked) {
      this.pendingMusic = key;
      return;
    }
    if (this.music?.key === key) return;
    const trackId = story.music[key] as MusicTrackId;
    const base = MUSIC_TRACKS[trackId];
    if (!base) {
      console.warn(`[audio] unknown music track for key "${key}"`);
      return;
    }
    const previous = this.music;
    if (previous) {
      previous.howl.fade(previous.howl.volume(previous.id) as number, 0, fade, previous.id);
      const stale = previous;
      setTimeout(() => {
        stale.howl.stop(stale.id);
        stale.howl.unload();
      }, fade + 100);
    }
    const howl = new Howl({
      src: audioSources(base),
      loop: true,
      volume: 0,
      html5: false,
      preload: true,
    });
    const id = howl.play();
    howl.fade(0, this.musicVolume, fade, id);
    this.music = { key, howl, id, level: 1 };
  }

  stopMusic(fade = MUSIC_FADE) {
    const current = this.music;
    this.music = null;
    this.pendingMusic = null;
    if (!current) return;
    current.howl.fade(current.howl.volume(current.id) as number, 0, fade, current.id);
    setTimeout(() => {
      current.howl.stop(current.id);
      current.howl.unload();
    }, fade + 100);
  }

  /** Briefly dip the music (used under dialogue & letters). */
  duckMusic(level = 0.45, duration = 600) {
    if (!this.music) return;
    this.music.level = level;
    this.music.howl.fade(this.music.howl.volume(this.music.id) as number, this.musicVolume * level, duration, this.music.id);
  }

  unduckMusic(duration = 900) {
    if (!this.music) return;
    this.music.level = 1;
    this.music.howl.fade(this.music.howl.volume(this.music.id) as number, this.musicVolume, duration, this.music.id);
  }

  /* ------------------------------------------------------------------ */
  /*  Ambient                                                           */
  /* ------------------------------------------------------------------ */

  private ambientLevel() {
    return this.ambientVolume * 0.8;
  }

  playAmbient(key: AmbientKey, fade = AMBIENT_FADE) {
    if (!isBrowser) return;
    if (!this.unlocked) {
      this.pendingAmbient = key;
      return;
    }
    if (this.ambient?.key === key) return;
    const previous = this.ambient;
    if (previous) {
      previous.howl.fade(previous.howl.volume(previous.id) as number, 0, fade, previous.id);
      setTimeout(() => {
        previous.howl.stop(previous.id);
        previous.howl.unload();
      }, fade + 100);
    }
    const howl = new Howl({ src: audioSources(AMBIENT_TRACKS[key]), loop: true, volume: 0, preload: true });
    const id = howl.play();
    howl.fade(0, this.ambientLevel(), fade, id);
    this.ambient = { key, howl, id, level: 1 };
  }

  stopAmbient(fade = AMBIENT_FADE) {
    const current = this.ambient;
    this.ambient = null;
    this.pendingAmbient = null;
    if (!current) return;
    current.howl.fade(current.howl.volume(current.id) as number, 0, fade, current.id);
    setTimeout(() => {
      current.howl.stop(current.id);
      current.howl.unload();
    }, fade + 100);
  }

  /* ------------------------------------------------------------------ */
  /*  SFX                                                               */
  /* ------------------------------------------------------------------ */

  private getSfx(key: SfxKey): Howl {
    let howl = this.sfxPool.get(key);
    if (!howl) {
      howl = new Howl({ src: audioSources(SFX[key]), preload: true, volume: 1 });
      this.sfxPool.set(key, howl);
    }
    return howl;
  }

  preloadSfx(keys: SfxKey[]) {
    if (!isBrowser) return;
    for (const key of keys) this.getSfx(key);
  }

  /** One-shot effect. Throttled per key to avoid machine-gun retriggers. */
  sfx(key: SfxKey, options: SfxOptions = {}) {
    if (!isBrowser || !this.unlocked || this.muted) return;
    const now = performance.now();
    const last = this.lastSfxAt.get(key) ?? 0;
    if (now - last < 40) return;
    this.lastSfxAt.set(key, now);
    const howl = this.getSfx(key);
    const id = howl.play();
    howl.volume((options.volume ?? 1) * this.sfxVolume, id);
    if (options.rate) howl.rate(options.rate, id);
  }

  startLoop(key: SfxKey, volume = 0.6, fade = 800) {
    if (!isBrowser || !this.unlocked) return;
    if (this.loops.has(key)) return;
    const howl = new Howl({ src: audioSources(SFX[key]), loop: true, volume: 0, preload: true });
    const id = howl.play();
    howl.fade(0, volume * this.sfxVolume, fade, id);
    this.loops.set(key, { key, howl, id, level: volume });
  }

  setLoopVolume(key: SfxKey, volume: number) {
    const loop = this.loops.get(key);
    if (!loop) return;
    loop.level = volume;
    loop.howl.volume(volume * this.sfxVolume, loop.id);
  }

  stopLoop(key: SfxKey, fade = 800) {
    const loop = this.loops.get(key);
    if (!loop) return;
    this.loops.delete(key);
    loop.howl.fade(loop.howl.volume(loop.id) as number, 0, fade, loop.id);
    setTimeout(() => {
      loop.howl.stop(loop.id);
      loop.howl.unload();
    }, fade + 100);
  }

  stopAllLoops() {
    for (const key of Array.from(this.loops.keys())) this.stopLoop(key, 400);
  }

  /** Stop everything (used when returning to the title screen). */
  stopAll() {
    this.stopMusic(900);
    this.stopAmbient(900);
    this.stopAllLoops();
  }
}

export const audio = new AudioManager();
