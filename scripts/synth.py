"""
Tiny procedural synthesiser used by generate-audio.py.

Everything here is pure numpy: oscillators, envelopes, a handful of
"instruments", simple delay/reverb, and encoders for OGG (libsndfile) and
MP3 (lameenc). All output is original — no samples are used anywhere.
"""

from __future__ import annotations

import math
import os
from dataclasses import dataclass

import numpy as np

SR = 44100
TAU = 2 * math.pi

# --------------------------------------------------------------------------- #
#  Basic building blocks
# --------------------------------------------------------------------------- #


def seconds(n: float) -> int:
    return int(round(n * SR))


def t_axis(duration: float) -> np.ndarray:
    return np.arange(seconds(duration), dtype=np.float64) / SR


def note_freq(midi: float) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


def sine(freq, duration, phase=0.0):
    t = t_axis(duration)
    if np.isscalar(freq):
        return np.sin(TAU * freq * t + phase)
    # frequency array → integrate
    ph = np.cumsum(np.asarray(freq) / SR) * TAU
    return np.sin(ph + phase)


def triangle(freq, duration):
    t = t_axis(duration)
    return 2 * np.abs(2 * ((t * freq) % 1) - 1) - 1


def saw(freq, duration):
    t = t_axis(duration)
    return 2 * ((t * freq) % 1) - 1


def square(freq, duration, duty=0.5):
    t = t_axis(duration)
    return np.where((t * freq) % 1 < duty, 1.0, -1.0)


def noise(duration, rng: np.random.Generator):
    return rng.uniform(-1, 1, seconds(duration))


def adsr(duration, a=0.01, d=0.1, s=0.7, r=0.2, curve=1.0):
    n = seconds(duration)
    env = np.zeros(n)
    na, nd, nr = seconds(a), seconds(d), seconds(r)
    na = min(na, n)
    env[:na] = np.linspace(0, 1, na) ** curve if na else []
    ns = max(0, n - na - nd - nr)
    if nd:
        end = min(n, na + nd)
        env[na:end] = np.linspace(1, s, end - na)
    if ns:
        env[na + nd : na + nd + ns] = s
    if nr:
        start = max(0, n - nr)
        env[start:] = np.linspace(env[start - 1] if start > 0 else s, 0, n - start)
    return env


def exp_decay(duration, tau=0.3):
    t = t_axis(duration)
    return np.exp(-t / tau)


def fade(x, fin=0.01, fout=0.05):
    x = x.copy()
    a = min(len(x), seconds(fin))
    b = min(len(x), seconds(fout))
    if a:
        x[:a] *= np.linspace(0, 1, a)
    if b:
        x[-b:] *= np.linspace(1, 0, b)
    return x


def lowpass(x, cutoff, order=1):
    """One-pole lowpass (repeated `order` times), implemented as a truncated
    exponential kernel so long buffers stay fast (FFT convolution)."""
    x = np.asarray(x, dtype=np.float64)
    dt = 1 / SR
    rc = 1 / (TAU * cutoff)
    alpha = dt / (rc + dt)
    y = x
    for _ in range(order):
        y = _iir_onepole(y, alpha)
    return y


def _iir_onepole(x, alpha):
    k = int(min(len(x), max(8, 6 / alpha)))
    kernel = alpha * (1 - alpha) ** np.arange(k)
    if len(x) * k > 2e7:
        n = len(x) + k
        y = np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(kernel, n), n)[: len(x)]
    else:
        y = np.convolve(x, kernel, mode="full")[: len(x)]
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def delay(x, time=0.35, feedback=0.35, mix=0.3):
    n = seconds(time)
    out = x.copy()
    buf = x.copy()
    for i in range(1, 6):
        shifted = np.zeros_like(x)
        if n * i < len(x):
            shifted[n * i :] = buf[: len(x) - n * i] * (feedback**i)
        out += shifted * mix
    return out


def reverb(x, size=1.5, mix=0.3, rng: np.random.Generator | None = None):
    """Cheap convolution reverb with an exponentially decaying noise tail."""
    rng = rng or np.random.default_rng(1)
    n = seconds(size)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / (SR * size / 4))
    ir[0] = 1.0
    ir = ir / np.sqrt(np.sum(ir**2))
    wet = np.fft.irfft(np.fft.rfft(x, len(x) + n) * np.fft.rfft(ir, len(x) + n))[: len(x)]
    return x * (1 - mix) + wet * mix * 3


def normalize(x, peak=0.9):
    m = np.max(np.abs(x)) if len(x) else 1
    return x * (peak / m) if m > 0 else x


def soft_clip(x, drive=1.0):
    return np.tanh(x * drive) / math.tanh(drive)


def stereo(mono, width=0.0, rng: np.random.Generator | None = None):
    """Mono → stereo with a tiny haas offset for width."""
    if width <= 0:
        return np.stack([mono, mono], axis=1)
    n = int(width * 0.0008 * SR)
    left = mono
    right = np.concatenate([np.zeros(n), mono[:-n]]) if n else mono
    return np.stack([left, right], axis=1)


def mix_at(buffer: np.ndarray, sound: np.ndarray, at: float, gain=1.0):
    start = seconds(at)
    end = min(len(buffer), start + len(sound))
    if end > start:
        buffer[start:end] += sound[: end - start] * gain


# --------------------------------------------------------------------------- #
#  Instruments
# --------------------------------------------------------------------------- #


def pad(freq, duration, detune=0.004, bright=0.4):
    """Warm detuned pad."""
    a = sine(freq, duration) + 0.5 * sine(freq * (1 + detune), duration) + 0.5 * sine(freq * (1 - detune), duration)
    a += bright * 0.3 * triangle(freq * 2, duration)
    env = adsr(duration, a=min(1.2, duration * 0.3), d=0.2, s=0.8, r=min(1.5, duration * 0.4))
    return a * env * 0.25


def bell(freq, duration=2.5, inharm=2.76):
    env1 = exp_decay(duration, tau=duration / 3)
    env2 = exp_decay(duration, tau=duration / 8)
    return (sine(freq, duration) * env1 + 0.4 * sine(freq * inharm, duration) * env2 + 0.2 * sine(freq * 4.07, duration) * env2 * 0.6) * 0.4


def pluck(freq, duration=1.2, bright=0.5):
    env = exp_decay(duration, tau=duration / 4)
    a = sine(freq, duration) + bright * 0.5 * sine(freq * 2, duration) * exp_decay(duration, tau=duration / 8)
    a += bright * 0.25 * sine(freq * 3, duration) * exp_decay(duration, tau=duration / 12)
    return a * env * 0.5


def piano(freq, duration=1.6):
    env = exp_decay(duration, tau=duration / 2.6)
    a = sine(freq, duration) + 0.45 * sine(freq * 2, duration) * exp_decay(duration, tau=duration / 6)
    a += 0.2 * sine(freq * 3, duration) * exp_decay(duration, tau=duration / 10)
    a += 0.08 * sine(freq * 4.01, duration) * exp_decay(duration, tau=duration / 14)
    attack = adsr(duration, a=0.004, d=0.0, s=1.0, r=0.1)
    return a * env * attack * 0.5


def music_box(freq, duration=1.8):
    env = exp_decay(duration, tau=duration / 5)
    a = sine(freq, duration) + 0.6 * sine(freq * 3.0, duration) * exp_decay(duration, tau=duration / 12) + 0.25 * sine(freq * 5.4, duration) * exp_decay(duration, tau=duration / 20)
    return a * env * 0.4


def choir(freq, duration, rng):
    vib = 1 + 0.004 * np.sin(TAU * 5.2 * t_axis(duration))
    base = sine(freq * vib, duration) + 0.5 * sine(freq * 2 * vib, duration) + 0.3 * sine(freq * 3 * vib, duration) + 0.15 * sine(freq * 4 * vib, duration)
    base = lowpass(base, 1800)
    env = adsr(duration, a=min(1.0, duration * 0.35), d=0.1, s=0.9, r=min(1.2, duration * 0.4))
    return base * env * 0.22


def sub_bass(freq, duration):
    env = adsr(duration, a=0.05, d=0.3, s=0.7, r=0.3)
    return (sine(freq, duration) + 0.2 * sine(freq * 2, duration)) * env * 0.5


def soft_kick(duration=0.4):
    t = t_axis(duration)
    f = 120 * np.exp(-t * 18) + 40
    return np.sin(np.cumsum(f / SR) * TAU) * np.exp(-t * 9) * 0.8


def shaker(rng, duration=0.12):
    return highpass(noise(duration, rng), 4000) * exp_decay(duration, tau=0.03) * 0.25


def chime_sparkle(rng, duration=1.2, base=1500):
    out = np.zeros(seconds(duration))
    for i in range(6):
        f = base * (1 + rng.uniform(0, 1.5))
        mix_at(out, bell(f, 0.8) * 0.5, rng.uniform(0, 0.4))
    return out


# --------------------------------------------------------------------------- #
#  Music helpers
# --------------------------------------------------------------------------- #

CHORDS = {
    "I": [0, 4, 7],
    "ii": [2, 5, 9],
    "iii": [4, 7, 11],
    "IV": [5, 9, 12],
    "V": [7, 11, 14],
    "vi": [9, 12, 16],
    "Iadd9": [0, 4, 7, 14],
    "IVmaj7": [5, 9, 12, 16],
    "vi7": [9, 12, 16, 19],
    "Vsus": [7, 12, 14],
    "i": [0, 3, 7],
    "iv": [5, 8, 12],
    "VI": [8, 12, 15],
    "III": [3, 7, 10],
    "VII": [10, 14, 17],
    "v": [7, 10, 14],
    "iiø": [2, 5, 8],
}


@dataclass
class Song:
    root: int  # midi
    bpm: float
    bars: int
    beats_per_bar: int = 4

    @property
    def beat(self):
        return 60 / self.bpm

    @property
    def bar(self):
        return self.beat * self.beats_per_bar

    @property
    def duration(self):
        return self.bar * self.bars


def render_progression(song: Song, chords: list[str], instrument, octave=0, gain=1.0, voicing_spread=True):
    out = np.zeros(seconds(song.duration))
    for i in range(song.bars):
        chord = CHORDS[chords[i % len(chords)]]
        for j, interval in enumerate(chord):
            midi = song.root + interval + 12 * octave
            if voicing_spread and j == 0:
                midi -= 12
            snd = instrument(note_freq(midi), song.bar * 1.05)
            mix_at(out, snd, i * song.bar, gain)
    return out


def render_melody(song: Song, pattern, instrument, scale, octave=1, gain=1.0, rng=None, humanize=0.01):
    """pattern: list of (beat_position, scale_degree or None, length_in_beats)."""
    out = np.zeros(seconds(song.duration))
    rng = rng or np.random.default_rng(3)
    total_beats = song.bars * song.beats_per_bar
    pat_len = max(p[0] + p[2] for p in pattern)
    pos = 0.0
    while pos < total_beats:
        for (b, deg, length) in pattern:
            if deg is None:
                continue
            at = (pos + b) * song.beat + rng.uniform(-humanize, humanize)
            if at < 0 or at > song.duration:
                continue
            midi = song.root + scale[deg % len(scale)] + 12 * (deg // len(scale)) + 12 * octave
            snd = instrument(note_freq(midi), max(0.4, length * song.beat * 1.4))
            mix_at(out, snd, at, gain * rng.uniform(0.85, 1.0))
        pos += pat_len
    return out


MAJOR = [0, 2, 4, 5, 7, 9, 11]
MINOR = [0, 2, 3, 5, 7, 8, 10]
PENTA = [0, 2, 4, 7, 9]


def make_loopable(x: np.ndarray, crossfade=1.5):
    """Crossfade the tail into the head so the loop point is seamless."""
    n = seconds(crossfade)
    if n * 2 > len(x):
        return x
    head = x[:n].copy()
    tail = x[-n:].copy()
    ramp = np.linspace(0, 1, n)
    if x.ndim == 2:
        ramp = ramp[:, None]
    x = x[:-n].copy()
    x[:n] = head * ramp + tail * (1 - ramp)
    return x


# --------------------------------------------------------------------------- #
#  Encoding
# --------------------------------------------------------------------------- #


def write_audio(path_base: str, data: np.ndarray, mp3_kbps=128):
    import lameenc
    import soundfile as sf

    if data.ndim == 1:
        data = np.stack([data, data], axis=1)
    data = np.clip(data, -1, 1).astype(np.float32)
    os.makedirs(os.path.dirname(path_base), exist_ok=True)
    # libsndfile's vorbis encoder overflows its stack on very large single
    # writes, so stream the buffer in blocks.
    with sf.SoundFile(path_base + ".ogg", "w", samplerate=SR, channels=2, format="OGG", subtype="VORBIS") as f:
        block = 32768
        for i in range(0, len(data), block):
            f.write(data[i : i + block])
    enc = lameenc.Encoder()
    enc.set_bit_rate(mp3_kbps)
    enc.set_in_sample_rate(SR)
    enc.set_channels(2)
    enc.set_quality(4)
    try:
        enc.silence()
    except AttributeError:
        pass
    pcm = (data * 32767).astype(np.int16).tobytes()
    mp3 = enc.encode(pcm) + enc.flush()
    with open(path_base + ".mp3", "wb") as f:
        f.write(mp3)
