#!/usr/bin/env python3
"""
Generate every music loop, ambience bed and sound effect used by the game.

    pip install numpy soundfile lameenc
    python3 scripts/generate-audio.py            # everything
    python3 scripts/generate-audio.py sfx        # only one group (music|ambient|sfx)

Output goes to public/audio/{music,ambient,sfx}/<name>.{ogg,mp3}. Every file is
procedurally synthesised here — no third-party samples — so the project ships
with 100 % original audio.
"""

from __future__ import annotations

import sys
import os
import zlib

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from synth import (  # noqa: E402
    MAJOR,
    MINOR,
    PENTA,
    SR,
    Song,
    adsr,
    bell,
    chime_sparkle,
    choir,
    delay,
    exp_decay,
    fade,
    highpass,
    lowpass,
    make_loopable,
    mix_at,
    music_box,
    noise,
    normalize,
    note_freq,
    pad,
    piano,
    pluck,
    render_melody,
    render_progression,
    reverb,
    seconds,
    shaker,
    sine,
    soft_clip,
    soft_kick,
    stereo,
    sub_bass,
    t_axis,
    triangle,
    write_audio,
)

ROOT = os.path.join(os.path.dirname(__file__), "..", "public", "audio")


def out(group: str, name: str):
    return os.path.join(ROOT, group, name)


# --------------------------------------------------------------------------- #
#  MUSIC
# --------------------------------------------------------------------------- #


def music_menu_theme(rng):
    song = Song(root=62, bpm=66, bars=16)  # D major, dreamy
    prog = ["Iadd9", "vi7", "IVmaj7", "Vsus"]
    mix = render_progression(song, prog, lambda f, d: pad(f, d, bright=0.3), octave=0, gain=0.9)
    mix += render_progression(song, prog, lambda f, d: choir(f, d, rng), octave=1, gain=0.35)
    mel = [(0, 4, 2), (2, 2, 1), (3, 1, 1), (4, 0, 2), (6, 1, 1), (7, 2, 1), (8, 4, 3), (11, 3, 1), (12, 2, 2), (14, 1, 2)]
    mix += render_melody(song, mel, lambda f, d: music_box(f, d), PENTA, octave=1, gain=0.5, rng=rng)
    mix += render_progression(song, prog, sub_bass, octave=-2, gain=0.4)
    mix = reverb(delay(mix, 0.45, 0.3, 0.2), size=2.4, mix=0.35, rng=rng)
    return make_loopable(stereo(normalize(mix, 0.8), 1.0), 2.0)


def music_ch1(rng):
    # Mysterious, floating: A minor with suspended colour
    song = Song(root=57, bpm=60, bars=16)
    prog = ["i", "VI", "III", "VII"]
    mix = render_progression(song, prog, lambda f, d: pad(f, d, detune=0.006, bright=0.2), octave=0, gain=0.8)
    mix += render_progression(song, prog, lambda f, d: choir(f, d, rng), octave=1, gain=0.25)
    mel = [(0, 4, 3), (3, 2, 1), (4, 3, 2), (6, 1, 2), (8, 0, 3), (11, 1, 1), (12, 2, 4)]
    mix += render_melody(song, mel, lambda f, d: bell(f, d, 2.4), MINOR, octave=2, gain=0.3, rng=rng)
    mix += render_progression(song, prog, sub_bass, octave=-2, gain=0.35)
    # Shimmer layer
    shimmer = np.zeros(seconds(song.duration))
    for i in range(40):
        mix_at(shimmer, bell(note_freq(81 + rng.choice(MINOR)), 2.0) * 0.08, rng.uniform(0, song.duration - 2))
    mix += shimmer
    mix = reverb(delay(mix, 0.6, 0.35, 0.25), size=3.0, mix=0.4, rng=rng)
    return make_loopable(stereo(normalize(mix, 0.8), 1.0), 2.5)


def music_ch2(rng):
    # Warm, nostalgic music box: F major
    song = Song(root=65, bpm=72, bars=16)
    prog = ["I", "V", "vi", "IV"]
    mix = render_progression(song, prog, lambda f, d: pad(f, d, bright=0.5), octave=0, gain=0.6)
    mel = [(0, 0, 1), (1, 2, 1), (2, 4, 1), (3, 2, 1), (4, 1, 1), (5, 3, 1), (6, 4, 2), (8, 3, 1), (9, 2, 1), (10, 1, 1), (11, 0, 1), (12, 1, 2), (14, 0, 2)]
    mix += render_melody(song, mel, lambda f, d: music_box(f, d), MAJOR, octave=2, gain=0.55, rng=rng)
    arp = [(0, 0, 0.5), (0.5, 2, 0.5), (1, 4, 0.5), (1.5, 7, 0.5), (2, 4, 0.5), (2.5, 2, 0.5), (3, 0, 0.5), (3.5, 2, 0.5)]
    mix += render_melody(song, arp, lambda f, d: pluck(f, d, 0.3), MAJOR, octave=1, gain=0.25, rng=rng)
    mix += render_progression(song, prog, sub_bass, octave=-2, gain=0.3)
    mix = reverb(delay(mix, 0.41, 0.25, 0.18), size=2.0, mix=0.3, rng=rng)
    return make_loopable(stereo(normalize(mix, 0.8), 0.8), 2.0)


def music_ch3(rng):
    # Melancholic ocean: E minor, slow swells
    song = Song(root=52, bpm=56, bars=16)
    prog = ["i", "iv", "VI", "v"]
    mix = render_progression(song, prog, lambda f, d: pad(f, d, detune=0.007, bright=0.15), octave=0, gain=0.9)
    mix += render_progression(song, prog, lambda f, d: choir(f, d, rng), octave=1, gain=0.4)
    mel = [(0, 2, 3), (3, 1, 1), (4, 0, 4), (8, 3, 2), (10, 2, 1), (11, 1, 1), (12, 0, 4)]
    mix += render_melody(song, mel, lambda f, d: piano(f, d), MINOR, octave=1, gain=0.5, rng=rng)
    mix += render_progression(song, prog, sub_bass, octave=-2, gain=0.4)
    # Slow swell LFO
    lfo = 0.75 + 0.25 * np.sin(2 * np.pi * t_axis(song.duration) / (song.bar * 2))
    mix *= lfo[: len(mix)]
    mix = reverb(delay(mix, 0.7, 0.4, 0.22), size=3.5, mix=0.45, rng=rng)
    return make_loopable(stereo(normalize(mix, 0.8), 1.0), 3.0)


def music_ch4(rng):
    # Grand, mysterious: C minor with organ-like pads and distant bells
    song = Song(root=48, bpm=58, bars=16)
    prog = ["i", "VI", "iv", "V"]
    organ = lambda f, d: pad(f, d, detune=0.002, bright=0.7) + 0.15 * triangle(f * 2, d) * adsr(d, a=0.8, d=0.2, s=0.8, r=1.0)
    mix = render_progression(song, prog, organ, octave=0, gain=0.6)
    mix += render_progression(song, prog, lambda f, d: choir(f, d, rng), octave=1, gain=0.45)
    mel = [(0, 0, 2), (2, 2, 2), (4, 3, 2), (6, 2, 1), (7, 1, 1), (8, 0, 4), (12, 4, 2), (14, 3, 2)]
    mix += render_melody(song, mel, lambda f, d: bell(f, d, 2.2), MINOR, octave=2, gain=0.3, rng=rng)
    mix += render_progression(song, prog, sub_bass, octave=-2, gain=0.5)
    # heartbeat-ish pulse
    for i in range(song.bars * 2):
        mix_at(mix, soft_kick(0.5) * 0.25, i * song.bar / 2)
        mix_at(mix, soft_kick(0.4) * 0.18, i * song.bar / 2 + song.beat * 0.6)
    mix = reverb(delay(mix, 0.55, 0.3, 0.2), size=4.0, mix=0.45, rng=rng)
    return make_loopable(stereo(normalize(mix, 0.8), 1.0), 2.5)


def music_ch5(rng):
    # Hopeful, emotional: G major piano + strings
    song = Song(root=55, bpm=68, bars=16)
    prog = ["I", "V", "vi", "IV", "I", "V", "IV", "Vsus"]
    mix = render_progression(song, prog, lambda f, d: pad(f, d, bright=0.4), octave=0, gain=0.7)
    mix += render_progression(song, prog, lambda f, d: choir(f, d, rng), octave=1, gain=0.3)
    mel = [(0, 4, 1.5), (1.5, 3, 0.5), (2, 2, 2), (4, 1, 1), (5, 2, 1), (6, 4, 2), (8, 7, 2), (10, 6, 1), (11, 4, 1), (12, 3, 2), (14, 2, 2)]
    mix += render_melody(song, mel, lambda f, d: piano(f, d), MAJOR, octave=1, gain=0.6, rng=rng)
    arp = [(0, 0, 0.5), (0.5, 4, 0.5), (1, 7, 0.5), (1.5, 9, 0.5), (2, 7, 0.5), (2.5, 4, 0.5), (3, 2, 0.5), (3.5, 4, 0.5)]
    mix += render_melody(song, arp, lambda f, d: pluck(f, d, 0.4), MAJOR, octave=1, gain=0.2, rng=rng)
    mix += render_progression(song, prog, sub_bass, octave=-2, gain=0.4)
    mix = reverb(delay(mix, 0.44, 0.3, 0.2), size=2.6, mix=0.35, rng=rng)
    return make_loopable(stereo(normalize(mix, 0.8), 0.9), 2.0)


def music_celebration(rng):
    # Bright, joyful: C major, faster, with sparkles and a soft beat
    song = Song(root=60, bpm=112, bars=16)
    prog = ["I", "IV", "vi", "V"]
    mix = render_progression(song, prog, lambda f, d: pad(f, d, bright=0.6), octave=0, gain=0.6)
    mel = [(0, 4, 1), (1, 4, 0.5), (1.5, 5, 0.5), (2, 7, 1), (3, 5, 1), (4, 4, 1), (5, 2, 1), (6, 4, 2), (8, 7, 1), (9, 7, 0.5), (9.5, 8, 0.5), (10, 9, 1), (11, 7, 1), (12, 5, 1), (13, 4, 1), (14, 2, 2)]
    mix += render_melody(song, mel, lambda f, d: music_box(f, d), MAJOR, octave=2, gain=0.5, rng=rng)
    mix += render_melody(song, mel, lambda f, d: pluck(f, d, 0.6), MAJOR, octave=1, gain=0.35, rng=rng)
    mix += render_progression(song, prog, sub_bass, octave=-2, gain=0.45)
    for i in range(song.bars * 4):
        mix_at(mix, soft_kick(0.35) * 0.4, i * song.beat)
        mix_at(mix, shaker(rng) * 0.8, i * song.beat + song.beat / 2)
    for i in range(24):
        mix_at(mix, chime_sparkle(rng, 1.0, 1800) * 0.3, rng.uniform(0, song.duration - 1.2))
    mix = reverb(delay(mix, 0.268, 0.25, 0.15), size=1.8, mix=0.25, rng=rng)
    return make_loopable(stereo(normalize(mix, 0.85), 0.8), 1.5)


def music_gentle_ending(rng):
    # Calm, accepting: A major slow piano with long pads
    song = Song(root=57, bpm=54, bars=12)
    prog = ["Iadd9", "IVmaj7", "vi7", "Vsus"]
    mix = render_progression(song, prog, lambda f, d: pad(f, d, bright=0.25), octave=0, gain=0.8)
    mel = [(0, 2, 3), (3, 1, 1), (4, 0, 4), (8, 1, 2), (10, 2, 2), (12, 4, 4)]
    mix += render_melody(song, mel, lambda f, d: piano(f, d), MAJOR, octave=1, gain=0.45, rng=rng)
    mix += render_progression(song, prog, sub_bass, octave=-2, gain=0.3)
    mix = reverb(delay(mix, 0.8, 0.35, 0.2), size=3.5, mix=0.45, rng=rng)
    return make_loopable(stereo(normalize(mix, 0.75), 1.0), 3.0)


MUSIC = {
    "menu-theme": music_menu_theme,
    "ch1-unknown-world": music_ch1,
    "ch2-garden-of-memories": music_ch2,
    "ch3-ocean-of-feelings": music_ch3,
    "ch4-castle-of-words": music_ch4,
    "ch5-final-destination": music_ch5,
    "celebration": music_celebration,
    "gentle-ending": music_gentle_ending,
}

# --------------------------------------------------------------------------- #
#  AMBIENT
# --------------------------------------------------------------------------- #


def amb_wind(rng, duration=40):
    n = noise(duration, rng)
    t = t_axis(duration)
    gust = 0.5 + 0.5 * np.sin(2 * np.pi * t / 9) * np.sin(2 * np.pi * t / 23 + 1)
    base = lowpass(n, 400, 2) * (0.5 + 0.5 * gust)
    whistle = lowpass(highpass(n, 900), 1400) * gust**2 * 0.5
    mix = base + whistle
    return make_loopable(stereo(normalize(mix, 0.5), 1.5), 3)


def amb_garden(rng, duration=40):
    t = t_axis(duration)
    breeze = lowpass(noise(duration, rng), 600, 2) * (0.35 + 0.25 * np.sin(2 * np.pi * t / 11))
    mix = breeze * 0.6
    # leaves rustle
    for i in range(40):
        d = rng.uniform(0.3, 1.2)
        r = highpass(noise(d, rng), 2500) * exp_decay(d, tau=d / 3) * rng.uniform(0.02, 0.06)
        mix_at(mix, r, rng.uniform(0, duration - d))
    # distant birds (little chirps)
    for i in range(26):
        d = rng.uniform(0.08, 0.2)
        f0 = rng.uniform(2200, 3800)
        chirp = sine(np.linspace(f0, f0 * rng.uniform(1.2, 1.6), seconds(d)), d) * adsr(d, 0.01, 0.02, 0.6, 0.05) * rng.uniform(0.03, 0.07)
        at = rng.uniform(0, duration - 0.5)
        mix_at(mix, chirp, at)
        if rng.random() < 0.6:
            mix_at(mix, chirp * 0.8, at + d + rng.uniform(0.05, 0.15))
    # fireflies / chimes
    for i in range(12):
        mix_at(mix, bell(rng.uniform(1600, 3200), 1.5) * 0.04, rng.uniform(0, duration - 2))
    return make_loopable(stereo(normalize(mix, 0.5), 1.5), 3)


def amb_ocean(rng, duration=40):
    t = t_axis(duration)
    n = noise(duration, rng)
    waves = lowpass(n, 500, 2)
    swell = np.zeros_like(t)
    for k in range(int(duration / 7) + 2):
        c = k * 7 + rng.uniform(-1, 1)
        swell += np.exp(-((t - c) ** 2) / (2 * 1.6**2))
    mix = waves * (0.3 + 0.7 * np.clip(swell, 0, 1)) + lowpass(n, 120, 2) * 0.6
    # soft lapping near the boat
    for i in range(50):
        d = rng.uniform(0.2, 0.6)
        lap = lowpass(noise(d, rng), 1500) * exp_decay(d, tau=d / 4) * rng.uniform(0.02, 0.05)
        mix_at(mix, lap, rng.uniform(0, duration - d))
    return make_loopable(stereo(normalize(mix, 0.55), 1.5), 4)


def amb_castle(rng, duration=40):
    t = t_axis(duration)
    n = noise(duration, rng)
    drone = (sine(55, duration) * 0.5 + sine(82.5, duration) * 0.25 + sine(110.5, duration) * 0.15) * (0.6 + 0.2 * np.sin(2 * np.pi * t / 13))
    room = lowpass(n, 250, 2) * 0.4
    mix = drone * 0.5 + room
    # dripping water
    for i in range(22):
        d = 0.25
        f0 = rng.uniform(1800, 3200)
        drip = sine(np.linspace(f0, f0 * 0.6, seconds(d)), d) * exp_decay(d, tau=0.05) * rng.uniform(0.04, 0.1)
        mix_at(mix, reverb(drip, 1.5, 0.6, rng), rng.uniform(0, duration - 2))
    # torch crackles
    for i in range(160):
        d = rng.uniform(0.01, 0.04)
        crack = highpass(noise(d, rng), 3000) * exp_decay(d, tau=d / 3) * rng.uniform(0.02, 0.06)
        mix_at(mix, crack, rng.uniform(0, duration - d))
    return make_loopable(stereo(normalize(mix, 0.5), 1.5), 3)


def amb_sky(rng, duration=40):
    t = t_axis(duration)
    n = noise(duration, rng)
    air = lowpass(n, 300, 2) * (0.5 + 0.3 * np.sin(2 * np.pi * t / 17))
    shimmer = np.zeros_like(t)
    for f in (523.25, 659.25, 783.99, 1046.5):
        shimmer += sine(f, duration) * (0.5 + 0.5 * np.sin(2 * np.pi * t / rng.uniform(5, 9) + rng.uniform(0, 6))) * 0.04
    mix = air + shimmer
    for i in range(16):
        mix_at(mix, bell(rng.uniform(1200, 2600), 2.5) * 0.03, rng.uniform(0, duration - 3))
    return make_loopable(stereo(normalize(mix, 0.45), 1.5), 4)


AMBIENT = {"wind": amb_wind, "garden": amb_garden, "ocean": amb_ocean, "castle": amb_castle, "sky": amb_sky}

# --------------------------------------------------------------------------- #
#  SFX
# --------------------------------------------------------------------------- #


def sweep(f0, f1, d, env=None, wave=sine):
    f = np.linspace(f0, f1, seconds(d))
    s = wave(f, d) if wave is sine else wave(f0, d)
    return s * (env if env is not None else exp_decay(d, tau=d / 3))


def sfx_ui_hover(rng):
    return fade(sine(1800, 0.06) * adsr(0.06, 0.005, 0.02, 0.4, 0.03) * 0.25)


def sfx_ui_click(rng):
    a = sweep(1400, 900, 0.09) * 0.4
    mix_at(a, highpass(noise(0.03, rng), 3000) * exp_decay(0.03, 0.008) * 0.3, 0)
    return fade(a, 0.001, 0.02)


def sfx_ui_open(rng):
    a = np.zeros(seconds(0.6))
    mix_at(a, sweep(500, 1100, 0.25, adsr(0.25, 0.01, 0.1, 0.5, 0.1)) * 0.3, 0)
    mix_at(a, bell(1760, 0.5) * 0.15, 0.05)
    return fade(a)


def sfx_ui_close(rng):
    a = sweep(1100, 500, 0.22, adsr(0.22, 0.01, 0.1, 0.5, 0.1)) * 0.3
    return fade(a)


def sfx_collect(rng):
    d = 0.9
    a = np.zeros(seconds(d))
    for i, f in enumerate([880, 1108.7, 1318.5, 1760]):
        mix_at(a, bell(f, 0.6) * 0.4, i * 0.07)
    return fade(a + chime_sparkle(rng, d, 2200) * 0.3)


def sfx_collect_flower(rng):
    d = 1.0
    a = np.zeros(seconds(d))
    for i, f in enumerate([698.5, 880, 1046.5, 1396.9]):
        mix_at(a, music_box(f, 0.8) * 0.5, i * 0.08)
    mix_at(a, lowpass(noise(0.2, rng), 1200) * exp_decay(0.2, 0.05) * 0.15, 0)
    return fade(a)


def sfx_quest_complete(rng):
    d = 1.6
    a = np.zeros(seconds(d))
    for i, f in enumerate([523.25, 659.25, 783.99, 1046.5]):
        mix_at(a, piano(f, 1.2) * 0.5, i * 0.12)
    mix_at(a, pad(523.25, 1.2) * 0.5 + pad(783.99, 1.2) * 0.4, 0.3)
    return fade(reverb(a, 1.5, 0.3, rng))


def sfx_chapter_complete(rng):
    d = 3.0
    a = np.zeros(seconds(d))
    for i, f in enumerate([392, 493.9, 587.3, 784, 987.8]):
        mix_at(a, piano(f, 2.0) * 0.5, i * 0.14)
    mix_at(a, pad(392, 2.4) * 0.5 + pad(587.3, 2.4) * 0.4 + pad(784, 2.4) * 0.3, 0.5)
    a += chime_sparkle(rng, d, 1600) * 0.4
    return fade(reverb(a, 2.2, 0.35, rng), 0.01, 0.4)


def sfx_portal_loop(rng):
    d = 4.0
    t = t_axis(d)
    a = sine(110 + 6 * np.sin(2 * np.pi * t / 2), d) * 0.3 + sine(220 + 8 * np.sin(2 * np.pi * t / 1.5 + 1), d) * 0.2
    a += lowpass(noise(d, rng), 900, 2) * (0.4 + 0.2 * np.sin(2 * np.pi * t / 1.3)) * 0.5
    a += sine(880 + 40 * np.sin(2 * np.pi * t / 0.7), d) * 0.04
    return make_loopable(normalize(a, 0.6), 0.8)


def sfx_portal_enter(rng):
    d = 2.2
    a = sweep(200, 1600, d, adsr(d, 0.4, 0.2, 0.8, 0.8)) * 0.35
    a += lowpass(noise(d, rng), 2500) * adsr(d, 0.6, 0.1, 0.8, 0.9) * 0.5
    mix_at(a, bell(1320, 1.5) * 0.3, 0.7)
    return fade(reverb(a, 2.0, 0.4, rng), 0.01, 0.4)


def paper_rustle(rng, d=0.5, gain=0.5):
    n = highpass(noise(d, rng), 1500)
    env = np.abs(lowpass(noise(d, rng), 30, 2)) * 8
    return lowpass(n * np.clip(env, 0, 1), 6000) * adsr(d, 0.02, 0.1, 0.6, 0.15) * gain


def sfx_letter_open(rng):
    a = np.zeros(seconds(1.4))
    mix_at(a, paper_rustle(rng, 0.7, 0.7), 0)
    mix_at(a, paper_rustle(rng, 0.5, 0.5), 0.5)
    mix_at(a, bell(1568, 1.0) * 0.12, 0.6)
    return fade(a)


def sfx_paper(rng):
    return fade(paper_rustle(rng, 0.45, 0.7))


def sfx_typewriter(rng):
    d = 0.05
    a = highpass(noise(d, rng), 2500) * exp_decay(d, 0.01) * 0.5
    a += sine(2400, d) * exp_decay(d, 0.006) * 0.3
    return fade(a, 0.001, 0.01)


def sfx_bottle_open(rng):
    d = 1.0
    a = np.zeros(seconds(d))
    # cork pop
    mix_at(a, sweep(500, 180, 0.08, exp_decay(0.08, 0.02)) * 0.8, 0)
    mix_at(a, lowpass(noise(0.05, rng), 2000) * exp_decay(0.05, 0.01) * 0.6, 0)
    # glass ring
    mix_at(a, bell(2093, 0.8, 2.3) * 0.25, 0.08)
    mix_at(a, paper_rustle(rng, 0.5, 0.4), 0.35)
    return fade(a)


def sfx_star_connect(rng):
    a = np.zeros(seconds(0.7))
    mix_at(a, bell(1568, 0.6) * 0.4, 0)
    mix_at(a, bell(2349, 0.5) * 0.25, 0.05)
    mix_at(a, sweep(900, 2400, 0.25, adsr(0.25, 0.02, 0.05, 0.5, 0.1)) * 0.12, 0)
    return fade(a)


def sfx_puzzle_complete(rng):
    d = 2.2
    a = np.zeros(seconds(d))
    for i, f in enumerate([659.25, 830.6, 987.8, 1318.5, 1661.2]):
        mix_at(a, bell(f, 1.6) * 0.4, i * 0.1)
    a += chime_sparkle(rng, d, 2400) * 0.5
    mix_at(a, pad(329.6, 1.6) * 0.5, 0.4)
    return fade(reverb(a, 2.0, 0.35, rng), 0.01, 0.4)


def sfx_key_pickup(rng):
    a = np.zeros(seconds(0.9))
    # metallic jingle
    for i in range(5):
        mix_at(a, bell(rng.uniform(2500, 5200), 0.3, 3.1) * 0.25, i * 0.05 + rng.uniform(0, 0.02))
    mix_at(a, bell(1174.7, 0.8) * 0.3, 0.15)
    mix_at(a, bell(1760, 0.8) * 0.25, 0.25)
    return fade(a)


def sfx_door_unlock(rng):
    d = 2.0
    a = np.zeros(seconds(d))
    # click of the mechanism
    mix_at(a, lowpass(noise(0.04, rng), 3000) * exp_decay(0.04, 0.008) * 0.8, 0)
    mix_at(a, sweep(300, 120, 0.1, exp_decay(0.1, 0.03)) * 0.6, 0.02)
    mix_at(a, lowpass(noise(0.04, rng), 3000) * exp_decay(0.04, 0.008) * 0.6, 0.22)
    # heavy stone sliding
    slide = lowpass(noise(1.4, rng), 220, 2) * adsr(1.4, 0.2, 0.2, 0.7, 0.5)
    mix_at(a, slide * 1.2, 0.35)
    mix_at(a, soft_kick(0.6) * 0.8, 1.5)
    mix_at(a, bell(523.25, 1.0) * 0.15, 0.6)
    return fade(reverb(a, 2.0, 0.35, rng), 0.005, 0.3)


def sfx_heartbeat(rng):
    d = 0.6
    a = np.zeros(seconds(d))
    mix_at(a, soft_kick(0.3) * 0.9, 0)
    mix_at(a, soft_kick(0.25) * 0.6, 0.22)
    return fade(lowpass(a, 200), 0.002, 0.1)


def sfx_gift_open(rng):
    d = 2.6
    a = np.zeros(seconds(d))
    mix_at(a, paper_rustle(rng, 0.8, 0.6), 0)
    mix_at(a, sweep(300, 1200, 1.2, adsr(1.2, 0.3, 0.2, 0.6, 0.5)) * 0.2, 0.4)
    for i, f in enumerate([783.99, 987.8, 1174.7, 1568, 1975.5]):
        mix_at(a, music_box(f, 1.4) * 0.4, 0.8 + i * 0.1)
    a += chime_sparkle(rng, d, 2000) * 0.4
    return fade(reverb(a, 2.0, 0.35, rng), 0.01, 0.4)


def sfx_firework(rng):
    d = 1.6
    a = np.zeros(seconds(d))
    # whistle up
    mix_at(a, sweep(600, 1800, 0.5, adsr(0.5, 0.05, 0.1, 0.5, 0.2)) * 0.08, 0)
    # burst
    mix_at(a, lowpass(noise(0.5, rng), 1200, 2) * exp_decay(0.5, 0.08) * 1.4, 0.5)
    mix_at(a, soft_kick(0.4) * 0.6, 0.5)
    # crackle
    for i in range(30):
        mix_at(a, highpass(noise(0.02, rng), 2500) * exp_decay(0.02, 0.005) * rng.uniform(0.1, 0.3), 0.6 + rng.uniform(0, 0.8))
    return fade(reverb(a, 1.8, 0.3, rng), 0.005, 0.3)


def sfx_jump(rng):
    d = 0.25
    a = sweep(300, 700, d, adsr(d, 0.01, 0.05, 0.5, 0.1)) * 0.3
    a += lowpass(noise(d, rng), 1500) * exp_decay(d, 0.04) * 0.2
    return fade(a)


def sfx_footstep(rng):
    d = 0.14
    a = lowpass(noise(d, rng), 600, 2) * exp_decay(d, 0.025) * 1.2
    a += sine(90, d) * exp_decay(d, 0.02) * 0.3
    return fade(a, 0.002, 0.04)


def sfx_whoosh(rng):
    d = 0.7
    t = t_axis(d)
    cutoff = 300 + 2500 * np.sin(np.pi * t / d)
    n = noise(d, rng)
    # time-varying filter approximation: crossfade between two filtered copies
    low = lowpass(n, 500, 2)
    high = lowpass(n, 3000, 2)
    k = (cutoff - 300) / 2500
    a = (low * (1 - k) + high * k) * np.sin(np.pi * t / d) ** 1.5 * 0.7
    return fade(a)


def sfx_bloom(rng):
    d = 1.8
    a = sweep(200, 900, d, adsr(d, 0.5, 0.3, 0.6, 0.6)) * 0.15
    a += lowpass(noise(d, rng), 1800) * adsr(d, 0.6, 0.3, 0.5, 0.6) * 0.2
    for i, f in enumerate([523.25, 659.25, 783.99, 1046.5, 1318.5]):
        mix_at(a, bell(f, 1.2) * 0.2, 0.3 + i * 0.12)
    return fade(reverb(a, 1.6, 0.3, rng), 0.01, 0.3)


def sfx_sparkle(rng):
    return fade(chime_sparkle(rng, 1.0, 2600) * 0.7)


def sfx_boat_loop(rng):
    d = 4.0
    t = t_axis(d)
    water = lowpass(noise(d, rng), 700, 2) * (0.5 + 0.3 * np.sin(2 * np.pi * t / 1.7) + 0.2 * np.sin(2 * np.pi * t / 0.9 + 2))
    creak = sine(180 + 20 * np.sin(2 * np.pi * t / 2.3), d) * (0.5 + 0.5 * np.sin(2 * np.pi * t / 2.3)) ** 6 * 0.08
    a = water * 0.6 + creak
    return make_loopable(normalize(a, 0.5), 0.8)


def sfx_memory_open(rng):
    d = 1.4
    a = np.zeros(seconds(d))
    mix_at(a, sweep(400, 1300, 0.6, adsr(0.6, 0.1, 0.1, 0.6, 0.3)) * 0.12, 0)
    for i, f in enumerate([880, 1108.7, 1318.5]):
        mix_at(a, music_box(f, 1.0) * 0.4, 0.15 + i * 0.1)
    mix_at(a, paper_rustle(rng, 0.4, 0.3), 0.05)
    return fade(reverb(a, 1.5, 0.3, rng), 0.01, 0.3)


SFX = {
    "ui-hover": sfx_ui_hover,
    "ui-click": sfx_ui_click,
    "ui-open": sfx_ui_open,
    "ui-close": sfx_ui_close,
    "collect": sfx_collect,
    "collect-flower": sfx_collect_flower,
    "quest-complete": sfx_quest_complete,
    "chapter-complete": sfx_chapter_complete,
    "portal-loop": sfx_portal_loop,
    "portal-enter": sfx_portal_enter,
    "letter-open": sfx_letter_open,
    "paper": sfx_paper,
    "typewriter": sfx_typewriter,
    "bottle-open": sfx_bottle_open,
    "star-connect": sfx_star_connect,
    "puzzle-complete": sfx_puzzle_complete,
    "key-pickup": sfx_key_pickup,
    "door-unlock": sfx_door_unlock,
    "heartbeat": sfx_heartbeat,
    "gift-open": sfx_gift_open,
    "firework": sfx_firework,
    "jump": sfx_jump,
    "footstep": sfx_footstep,
    "whoosh": sfx_whoosh,
    "bloom": sfx_bloom,
    "sparkle": sfx_sparkle,
    "boat-loop": sfx_boat_loop,
    "memory-open": sfx_memory_open,
}


# --------------------------------------------------------------------------- #


def main(groups):
    if "music" in groups:
        for name, fn in MUSIC.items():
            rng = np.random.default_rng(zlib.crc32(name.encode()))
            data = fn(rng)
            write_audio(out("music", name), data, mp3_kbps=128)
            print(f"music/{name}  {len(data) / SR:5.1f}s")
    if "ambient" in groups:
        for name, fn in AMBIENT.items():
            rng = np.random.default_rng(zlib.crc32(name.encode()))
            data = fn(rng)
            write_audio(out("ambient", name), data, mp3_kbps=96)
            print(f"ambient/{name}  {len(data) / SR:5.1f}s")
    if "sfx" in groups:
        for name, fn in SFX.items():
            rng = np.random.default_rng(zlib.crc32(name.encode()))
            data = fn(rng)
            data = np.asarray(data, dtype=np.float64)
            data = normalize(data, 0.85) if name not in ("ui-hover", "typewriter", "footstep") else normalize(data, 0.6)
            write_audio(out("sfx", name), stereo(data), mp3_kbps=96)
            print(f"sfx/{name}  {len(data) / SR:5.2f}s")


if __name__ == "__main__":
    args = sys.argv[1:] or ["music", "ambient", "sfx"]
    main(args)
