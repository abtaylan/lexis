#!/usr/bin/env python3
"""
v3: lo-fi chill-but-rhythmic background track (the "study beats" / TikTok-Shorts
lo-fi hip-hop" sound) for the Lexis video. 100% synthesized, no samples:
  - swung, soft boom-bap drum pattern (muffled kick, brushed snare/clap, dark closed hat)
  - Rhodes-style electric piano chords (FM-ish overtones, soft attack) with slow
    "tape wobble" pitch wander for warmth
  - laid-back sine/triangle sub bass
  - a thin, constant vinyl-crackle/hiss bed underneath for texture
~78 BPM, same jazzy chord progression (Cmaj7 - Am7 - Fmaj7 - Gsus/G) -- the
7th chords are exactly what makes lo-fi sound like lo-fi.
"""
import numpy as np
from scipy.io import wavfile

SR = 44100
DURATION = 24.3
BPM = 78
BEAT = 60.0 / BPM
SWING = 0.63  # off-beat eighth lands at 63% through the beat instead of 50% -> lazy groove

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

def note_freq(note, octave=4):
    n = NOTE_NAMES.index(note)
    semitones_from_a4 = (octave - 4) * 12 + (n - NOTE_NAMES.index('A'))
    return 440.0 * (2 ** (semitones_from_a4 / 12))

def adsr(n, sr, attack, decay, sustain_level, release):
    env = np.ones(n)
    a = min(int(attack * sr), n)
    d = min(int(decay * sr), max(n - a, 0))
    r = min(int(release * sr), n)
    if a > 0:
        env[:a] = np.linspace(0, 1, a)
    if d > 0:
        env[a:a + d] = np.linspace(1, sustain_level, d)
    sustain_end = max(n - r, a + d)
    if sustain_end > a + d:
        env[a + d:sustain_end] = sustain_level
    if r > 0:
        env[sustain_end:] = np.linspace(sustain_level, 0, n - sustain_end)
    return env

def place(master, start_sample, signal):
    n = master.shape[0]
    s = max(start_sample, 0)
    e = min(start_sample + len(signal), n)
    if e <= s:
        return
    master[s:e] += signal[: e - s]

def kick(sr, dur=0.22, f0=110, f1=38, amp=0.75):
    n = int(dur * sr)
    t = np.arange(n) / sr
    freq = f0 * (f1 / f0) ** (t / dur)
    phase = 2 * np.pi * np.cumsum(freq) / sr
    sig = np.sin(phase)
    env = np.exp(-t * 11)
    return amp * sig * env

def snare(sr, dur=0.16, amp=0.22):
    n = int(dur * sr)
    noise = np.random.uniform(-1, 1, n)
    window = max(int(sr / 2500), 1)
    kernel = np.ones(window) / window
    noise = np.convolve(noise, kernel, mode='same')
    tone = 0.25 * np.sin(2 * np.pi * 185 * np.arange(n) / sr)
    env = np.exp(-np.arange(n) / sr * 16)
    return amp * (noise * 0.8 + tone) * env

def hat(sr, dur=0.06, amp=0.10):
    n = int(dur * sr)
    noise = np.random.uniform(-1, 1, n)
    window = max(int(sr / 3500), 1)
    kernel = np.ones(window) / window
    smooth = np.convolve(noise, kernel, mode='same')
    hp = noise - smooth
    env = np.exp(-np.arange(n) / sr * 55)
    return amp * hp * env

def bass_note(freq, sr, dur=0.55, amp=0.42):
    n = int(dur * sr)
    t = np.arange(n) / sr
    sig = 0.8 * np.sin(2 * np.pi * freq * t) + 0.15 * np.sin(2 * np.pi * freq * 2 * t)
    env = adsr(n, sr, attack=0.015, decay=0.15, sustain_level=0.5, release=dur * 0.55)
    return amp * sig * env

def rhodes_voice(freq, n_samples, sr, amp=1.0):
    """FM-ish electric piano bell tone: carrier + slightly detuned higher partial, bell attack."""
    t = np.arange(n_samples) / sr
    mod = np.sin(2 * np.pi * freq * 2.01 * t) * np.exp(-t * 7) * 0.5
    carrier = np.sin(2 * np.pi * freq * t + mod)
    bell = 0.18 * np.sin(2 * np.pi * freq * 4 * t) * np.exp(-t * 10)
    return amp * (carrier + bell)

def vinyl_crackle(n_samples, sr, amp=0.018, pop_rate=2.2):
    hiss = np.random.uniform(-1, 1, n_samples)
    window = max(int(sr / 4000), 1)
    kernel = np.ones(window) / window
    hiss = np.convolve(hiss, kernel, mode='same') - np.convolve(hiss, np.ones(max(int(sr/300),1))/max(int(sr/300),1), mode='same')
    n_pops = int(n_samples / sr * pop_rate)
    pops = np.zeros(n_samples)
    rng = np.random.default_rng(42)
    for _ in range(n_pops):
        pos = rng.integers(0, max(n_samples - 50, 1))
        pop_len = rng.integers(8, 40)
        pop_env = np.exp(-np.arange(pop_len) / pop_len * 6)
        pops[pos:pos + pop_len] += rng.uniform(0.4, 1.0) * pop_env
    return amp * (hiss * 0.5 + pops * 0.5)

CHORDS = [
    {'notes': [('C', 3), ('E', 3), ('G', 3), ('B', 3)], 'root': ('C', 2)},
    {'notes': [('A', 2), ('C', 3), ('E', 3), ('G', 3)], 'root': ('A', 1)},
    {'notes': [('F', 2), ('A', 2), ('C', 3), ('E', 3)], 'root': ('F', 1)},
    {'notes': [('G', 2), ('C', 3), ('D', 3), ('G', 3)], 'root': ('G', 1)},
]

N = int(DURATION * SR)
master = np.zeros(N)

chord_len = DURATION / len(CHORDS)
chord_len_samples = int(chord_len * SR)

# --- Rhodes chord comping: a soft sustained stab at the start of each chord segment,
#     plus one shorter "answer" stab partway through, classic lo-fi comping feel ---
for i, chord in enumerate(CHORDS):
    seg_start = i * chord_len_samples
    seg_end = min(seg_start + chord_len_samples, N)
    seg_len = seg_end - seg_start
    if seg_len <= 0:
        continue

    # main stab: soft attack, long release, slight tape-wobble vibrato
    main_len = min(int(chord_len * 0.62 * SR), seg_len)
    env1 = adsr(main_len, SR, attack=0.04, decay=0.3, sustain_level=0.55, release=main_len / SR * 0.7)
    t1 = np.arange(main_len) / SR
    wobble = 1 + 0.004 * np.sin(2 * np.pi * 0.7 * t1) + 0.002 * np.sin(2 * np.pi * 2.3 * t1)
    sig1 = np.zeros(main_len)
    for note, octv in chord['notes']:
        sig1 += rhodes_voice(note_freq(note, octv) * 1.0, main_len, SR, amp=0.11)
    sig1 *= wobble
    place(master, seg_start, sig1 * env1)

    # answer stab: shorter, slightly later, only top 2 notes (lighter texture)
    answer_start = seg_start + int(chord_len * 0.66 * SR)
    answer_len = min(int(chord_len * 0.3 * SR), max(seg_end - answer_start, 0))
    if answer_len > 100:
        env2 = adsr(answer_len, SR, attack=0.02, decay=0.2, sustain_level=0.4, release=answer_len / SR * 0.6)
        sig2 = np.zeros(answer_len)
        for note, octv in chord['notes'][1:3]:
            sig2 += rhodes_voice(note_freq(note, octv + 1), answer_len, SR, amp=0.08)
        place(master, answer_start, sig2 * env2)

# --- swung drum + bass pattern on a global beat grid ---
total_beats = int(DURATION / BEAT)
for b in range(total_beats):
    t_beat = b * BEAT
    sample_pos = int(t_beat * SR)
    chord_idx = min(int(t_beat / chord_len), len(CHORDS) - 1)
    chord = CHORDS[chord_idx]
    beat_in_bar = b % 4

    # boom-bap pattern: kick on 1 and the swung "+" of 2; snare/clap on 2 and 4
    if beat_in_bar == 0:
        place(master, sample_pos, kick(SR, amp=0.7))
    if beat_in_bar == 1:
        place(master, sample_pos, snare(SR, amp=0.2))
        # extra lazy kick on the swung upbeat after beat 2
        swung_pos = int((t_beat + SWING * BEAT) * SR)
        place(master, swung_pos, kick(SR, amp=0.45))
    if beat_in_bar == 3:
        place(master, sample_pos, snare(SR, amp=0.2))

    # dark, soft closed hats on straight 8ths with swing applied to the off-beat
    place(master, sample_pos, hat(SR, amp=0.085))
    swung_off = int((t_beat + SWING * BEAT) * SR)
    place(master, swung_off, hat(SR, amp=0.06))

    # laid-back bass: root note on beat 1, and a softer repeat on beat 3
    if beat_in_bar in (0, 2):
        note, octv = chord['root']
        place(master, sample_pos, bass_note(note_freq(note, octv), SR, amp=0.4 if beat_in_bar == 0 else 0.3))

# --- vinyl crackle bed, continuous ---
master += vinyl_crackle(N, SR, amp=0.02)

# gentle overall warmth + light bitcrush-ish quantization for dusty lo-fi character
def soft_lowpass(signal, sr, cutoff_hz, passes=1):
    window = max(int(sr / cutoff_hz), 1)
    kernel = np.ones(window) / window
    out = signal
    for _ in range(passes):
        out = np.convolve(out, kernel, mode='same')
    return out

master = soft_lowpass(master, SR, cutoff_hz=6500, passes=1)

peak = np.max(np.abs(master)) + 1e-9
master = master / peak * 0.82

# light sample-and-hold style quantization (subtle, ~11-bit) for dusty texture
levels = 2 ** 11
master = np.round(master * levels) / levels

fade_in_s, fade_out_s = 0.7, 1.4
fi = int(fade_in_s * SR)
fo = int(fade_out_s * SR)
master[:fi] *= np.linspace(0, 1, fi)
master[-fo:] *= np.linspace(1, 0, fo)

delay_samples = 11
right = np.zeros_like(master)
right[delay_samples:] = master[:-delay_samples]
left = master

stereo = np.stack([left, right], axis=1)
stereo_i16 = np.clip(stereo * 32767, -32768, 32767).astype(np.int16)

wavfile.write('/tmp/lexis_video/bg_music_v3.wav', SR, stereo_i16)
print("wrote bg_music_v3.wav", stereo_i16.shape[0] / SR, "s")
