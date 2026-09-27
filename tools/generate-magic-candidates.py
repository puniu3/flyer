from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[1]
prompts = {
    'a': (251, 'TrackType: SFX. One comical rubbery magical transformation sound. A tiny spring winds up and releases a deep elastic boioioing, sliding rapidly up then down in pitch, ending in a soft wooden pop. Cartoon toy shapeshift, playful and surprising, one quick gesture under one second with a short decay, then silence. No music, no voices, no ringing bell, no repeated rhythm.'),
    'b': (252, 'TrackType: SFX. One quirky liquid polymorph sound. A tiny wet bubbly gloop is sucked inward, quickly swirls and pops outward with a round plop. A small object changing shape like magical jelly, funny and tactile, compact under one second, then silence. No music, no speech, no bells, no water ambience, no looping.'),
    'c': (253, 'TrackType: SFX. One mischievous magician transformation sound. A fast rising slide whistle curls sharply downward into a little puff and a hollow cork pop. Whimsical cartoon conjuring trick, a tiny impossible object appears, one brisk gesture under one second, then silence. No melody, no speech, no fanfare, no ringing chimes, no repeated rhythm.'),
    'd': (254, 'TrackType: SFX. One intricate tiny clockwork transformation sound. A quick dry ratchet zrrrip, three very fast delicate wooden clicks folding inward, then one resonant hollow tok as the toy locks into a new shape. Magical miniature mechanical puzzle turning inside out, tactile and playful, under one second, then silence. No music, no voice, no electronic beeps, no repeated rhythm.'),
}
for name, (seed, prompt) in prompts.items():
    folder = root / '.audio-generation' / f'magic-{name}'
    folder.mkdir(parents=True, exist_ok=True)
    (folder / 'prompt.txt').write_text(prompt + '\n')
    subprocess.run(['stable', str(folder), '--seconds', '5', '--seed', str(seed), '--steps', '8', '--cfg', '1.0'], check=True)
