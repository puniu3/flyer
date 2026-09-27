from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[1]
prompts = {
    'a': (271, 'TrackType: SFX. A single delicate magical tiliing sound. Two very quick ascending crystal bell notes blend into one small clear shimmering ring. Soft rounded attack, pure glassy tone, brief natural decay. A restrained fantasy board game spell cue, less than one second then silence. No music, no voice, no whoosh, no cartoon noises, no repeating sequence.'),
    'b': (271, 'TrackType: SFX. A single warm magical tilun sound. Two quick ascending celesta notes, a tiny bright tick opening into a mellow rounded bell resonance. Intimate wooden music box character, soft attack and short gentle decay. A restrained fantasy board game spell cue, less than one second then silence. No music, no voice, no whoosh, no cartoon noises, no repeating sequence.'),
    'c': (271, 'TrackType: SFX. A single airy magical tirin sound. A delicate high harp pluck immediately followed by a higher tiny silver chime. Light clean sparkling upper harmonics and a short smooth tail. A restrained fantasy board game spell cue, less than one second then silence. No music, no voice, no whoosh, no cartoon noises, no repeating sequence.'),
    'd': (271, 'TrackType: SFX. A single soft magical tilung sound. Two quick rising notes from a rounded sine bell with faint ethereal overtones. A clear tiny onset blooms into a smooth hollow luminous ring, with brief gentle decay. A restrained fantasy board game spell cue, less than one second then silence. No music, no voice, no whoosh, no cartoon noises, no repeating sequence.'),
}
for name, (seed, prompt) in prompts.items():
    folder = root / '.audio-generation' / f'magic-tilun-{name}'
    folder.mkdir(parents=True, exist_ok=True)
    (folder / 'prompt.txt').write_text(prompt + '\n')
    subprocess.run(['stable', str(folder), '--seconds', '5', '--seed', str(seed), '--steps', '8', '--cfg', '1.0'], check=True)
