from pathlib import Path
import hashlib
import json
import subprocess

root = Path(__file__).resolve().parents[1]
recipes = json.loads((root / 'public/assets/audio/manifest.json').read_text())
out = root / 'src/assets/audio'
out.mkdir(parents=True, exist_ok=True)
manifest = {}
imports = []
for cue in recipes:
    source = root / f'public/assets/audio/{cue}.wav'
    target = out / f'{cue}.mp3'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source), '-map_metadata', '-1', '-c:a', 'libmp3lame', '-q:a', '2', '-ar', '44100', '-ac', '2', str(target)], check=True)
    manifest[cue] = {
        'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
        'source_bytes': source.stat().st_size,
        'bytes': target.stat().st_size,
        'encoder': 'libmp3lame', 'quality': 2, 'sample_rate': 44100, 'channels': 2,
    }
    imports.append(f'import {cue} from "./assets/audio/{cue}.mp3?url";')
(root / 'src/audio-assets.ts').write_text('\n'.join(imports) + '\nexport const AUDIO_URLS = { ' + ', '.join(recipes) + ' };\n')
(root / 'art/audio/encoded.json').write_text(json.dumps(manifest, indent=2) + '\n')
print('WAV:', sum(x['source_bytes'] for x in manifest.values()), 'MP3:', sum(x['bytes'] for x in manifest.values()))
