from pathlib import Path
import subprocess
import time
root=Path(__file__).resolve().parents[1]
cues={
 'roll':(181,'TrackType: SFX. Five small solid wooden dice tumble together across a felt-lined wooden board game tray. A brief lively cluster of dry rounded wooden clacks, little bouncing ticks slow down and settle. One compact rolling gesture lasting about one second, followed by silence. Close microphone tactile foley. No music, speech, ambience or electronic tones.'),
 'skill':(184,'TrackType: SFX. A fingertip flips one thick cardboard game tile onto a wooden table. A short dry papery brush then one soft satisfying woody tap. Close microphone intimate tactile foley, small object, one isolated gesture followed by silence. No music, speech or ambience.')}
for cue,(seed,prompt) in cues.items():
 folder=root/'.audio-generation'/cue
 folder.mkdir(parents=True,exist_ok=True)
 (folder/'prompt.txt').write_text(prompt+'\n')
 start=time.monotonic()
 subprocess.run(['stable',str(folder),'--seconds','5','--seed',str(seed),'--steps','8','--cfg','1.0'],check=True)
 print(f'{cue}: {time.monotonic()-start:.2f}s',flush=True)
