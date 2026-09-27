from pathlib import Path
import array
import hashlib
import json
import math
import wave

root = Path(__file__).resolve().parents[1]
recipes = {'a': [0, 1.4, .65], 'b': [0, .95, .45], 'c': [0, 1.15, .55], 'd': [0, 1.25, .6]}
output = root / 'public/assets/audio/magic-candidates'
output.mkdir(parents=True, exist_ok=True)
manifest = {}
for cue, (start, end, fade) in recipes.items():
    source = root / f'art/audio/magic-candidates/{cue}.wav'
    with wave.open(str(source)) as wav:
        rate = wav.getframerate()
        assert wav.getnchannels() == 2 and wav.getsampwidth() == 2
        data = array.array('h', wav.readframes(wav.getnframes()))
    samples = [[data[2*i+c]/32768 for c in range(2)] for i in range(int(start*rate), int(end*rate))]
    alpha = math.exp(-2*math.pi*45/rate)
    before, filtered = [0,0], [0,0]
    for i, frame in enumerate(samples):
        for c in range(2):
            value = frame[c]
            filtered[c] = alpha*(filtered[c]+value-before[c])
            before[c] = value
            frame[c] = filtered[c]
        middle = (frame[0]+frame[1])/2
        side = (frame[0]-frame[1])/2*.25
        tail = min(1, max(0, (len(samples)-1-i)/(rate*fade)))
        envelope = min(1, i/(rate*.003))*(.5-.5*math.cos(math.pi*tail))
        frame[:] = [(middle+side)*envelope, (middle-side)*envelope]
    gain = .5/max(abs(x) for frame in samples for x in frame)
    pcm = array.array('h', [round(x*gain*32767) for frame in samples for x in frame])
    path = output / f'{cue}.wav'
    with wave.open(str(path), 'wb') as wav:
        wav.setparams((2,2,rate,0,'NONE','not compressed'))
        wav.writeframes(pcm.tobytes())
    manifest[cue] = {'source':str(source.relative_to(root)), 'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(), 'trim_seconds':[start,end], 'fade_seconds':[.003,fade], 'fade_out_curve':'half-cosine', 'highpass_hz':45, 'stereo_width':.25, 'normalization_gain':gain, 'duration':len(samples)/rate, 'peak':max(map(abs,pcm))/32768, 'clipped_samples':sum(abs(x)>=32767 for x in pcm), 'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
(output/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
print(json.dumps(manifest, indent=2))
