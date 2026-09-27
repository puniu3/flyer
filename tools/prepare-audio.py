from pathlib import Path
import array
import hashlib
import json
import math
import wave

root = Path(__file__).resolve().parents[1]
recipes = {
    'mighty': {'trim': [0, .65], 'target_peak': .62, 'body': 0, 'fade_out': .2},
    'acrobatics': {'trim': [3.49, 3.85], 'target_peak': .48, 'body': 0, 'fade_out': .12},
    'magic': {'trim': [0, .95], 'target_peak': .5, 'body': 0, 'fade_in': .003, 'fade_out': .45},
    'defeat': {'trim': [0, 4.6], 'target_peak': .5, 'body': 0},
    'victory': {'trim': [0, 4.2], 'target_peak': .68, 'body': 0},
    'pickup': {'trim': [1.337, 1.53], 'target_peak': .42, 'body': 0},
    'place': {'trim': [3.122, 3.44], 'target_peak': .74, 'body': .38},
    'roll': {'trim': [1.79, 2.99], 'target_peak': .68, 'body': 0},
    'skill': {'trim': [3.185, 3.56], 'target_peak': .42, 'body': .1},
    'gather': {'trim': [2.712, 3.46], 'target_peak': .65, 'body': 0},
}
manifest = {}
for cue, recipe in recipes.items():
    path = root / 'art/audio/sources' / f'{cue}.wav'
    with wave.open(str(path)) as wav:
        rate, channels = wav.getframerate(), wav.getnchannels()
        assert wav.getsampwidth() == 2 and channels == 2
        raw = array.array('h', wav.readframes(wav.getnframes()))
    start, end = recipe['trim']
    samples = [[raw[i * 2 + channel] / 32768 for channel in range(2)] for i in range(int(start * rate), int(end * rate))]
    alpha = math.exp(-2 * math.pi * 45 / rate)
    previous_in, previous_out = [0, 0], [0, 0]
    for frame in samples:
        for channel in range(2):
            x = frame[channel]
            frame[channel] = alpha * (previous_out[channel] + x - previous_in[channel])
            previous_in[channel], previous_out[channel] = x, frame[channel]
        middle = (frame[0] + frame[1]) / 2
        side = (frame[0] - frame[1]) / 2 * .25
        frame[:] = [middle + side, middle - side]
    if recipe['body']:
        source = [frame[:] for frame in samples]
        length = math.ceil(len(source) / .82)
        samples += [[0, 0] for _ in range(length - len(samples))]
        filtered = [0, 0]
        coefficient = 1 - math.exp(-2 * math.pi * 420 / rate)
        for i in range(length):
            position = min(i * .82, len(source) - 1)
            index = int(position)
            fraction = position - index
            for channel in range(2):
                value = source[index][channel] * (1 - fraction) + source[min(index + 1, len(source) - 1)][channel] * fraction
                filtered[channel] += coefficient * (value - filtered[channel])
                samples[i][channel] += filtered[channel] * recipe['body']
    frames = len(samples)
    fade_out = recipe.get('fade_out', .035)
    fade_in = recipe.get('fade_in', .001)
    for i, frame in enumerate(samples):
        tail = min(1, max(0, (frames - 1 - i) / (rate * fade_out)))
        if 'fade_out' in recipe:
            tail = .5 - .5 * math.cos(math.pi * tail)
        envelope = min(1, i / (rate * fade_in), tail)
        for channel in range(2):
            frame[channel] *= max(0, envelope)
    gain = recipe['target_peak'] / max(abs(value) for frame in samples for value in frame)
    pcm = array.array('h', [round(value * gain * 32767) for frame in samples for value in frame])
    output = root / 'public/assets/audio' / f'{cue}.wav'
    with wave.open(str(output), 'wb') as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(rate)
        wav.writeframes(pcm.tobytes())
    manifest[cue] = {
        'source': str(path.relative_to(root)), 'source_sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
        'trim_seconds': recipe['trim'], 'highpass_hz': 45, 'stereo_width': .25,
        'body_layer': {'gain': recipe['body'], 'rate': .82, 'lowpass_hz': 420},
        'fade_seconds': [fade_in, fade_out], 'normalization_gain': gain,
        **({'fade_out_curve': 'half-cosine'} if 'fade_out' in recipe else {}),
        'duration': frames / rate, 'peak': max(abs(value) for value in pcm) / 32768,
        'rms': math.sqrt(sum((value / 32768) ** 2 for value in pcm) / len(pcm)),
        'clipped_samples': sum(abs(value) >= 32767 for value in pcm),
        'bytes': output.stat().st_size, 'sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
        'listening_review': 'Audition in audio-demo.html; waveform validation does not certify timbre.'
    }
(root / 'public/assets/audio/manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps(manifest, indent=2))
