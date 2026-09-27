from pathlib import Path
import subprocess
import time
import argparse
root=Path(__file__).resolve().parents[1]
cues={
 'mighty':(231,'TrackType: SFX. One isolated low heavy wooden thud with a padded leather body and a tiny dry brass rattle. A firm tabletop fantasy strength spell impact, compact and warm, under half a second, then silence. No voices, no music, no explosions, no repeating rhythm.'),
 'acrobatics':(232,'TrackType: SFX. One quick light airy swish ending in a crisp tiny wooden tap. A nimble tabletop game movement, delicate and dry, under half a second, then silence. No voices, no music, no reverb, no repeating rhythm.'),
 'magic':(281,'TrackType: SFX. One small wooden die tossed into a felt lined wooden tray. A quick dry rounded roll-clack, a very faint brief inward air suction, then one soft hollow wooden tok as the die is pulled snugly to a precise stop. Close intimate tactile tabletop foley, subtle magnetic settling gesture, compact half second event with a short dry decay then silence. Wood is prominent, air is quiet. No music, no bell, no voice, no electronic tone, no cartoon boing, no repeated throws.'),
 'defeat':(207,'TrackType: SFX. A short gentle fantasy game over sting. Three soft low brass notes descending, ending with a muted wooden resonance and a clean short decay into silence. A small acoustic ensemble, subdued and final, about two seconds. No voices, no drums, no looping music, no loud impact.'),
 'victory':(195,'TrackType: SFX. A short triumphant fantasy victory fanfare. Three warm brass trumpet notes rising into one satisfying major chord, with a delicate golden bell accent and a clean natural decay. A compact celebratory game reward sting lasting two seconds, followed by silence. Small acoustic ensemble, no drums, no voice, no looping background music.'),
 'roll':(181,'TrackType: SFX. Five small solid wooden dice tumble together across a felt-lined wooden board game tray. A brief lively cluster of dry rounded wooden clacks, little bouncing ticks slow down and settle. One compact rolling gesture lasting about one second, followed by silence. Close microphone tactile foley. No music, speech, ambience or electronic tones.'),
 'skill':(184,'TrackType: SFX. A fingertip flips one thick cardboard game tile onto a wooden table. A short dry papery brush then one soft satisfying woody tap. Close microphone intimate tactile foley, small object, one isolated gesture followed by silence. No music, speech or ambience.')}
parser=argparse.ArgumentParser()
parser.add_argument('cues',nargs='*',choices=list(cues))
selected=parser.parse_args().cues or list(cues)
for cue in selected:
 seed,prompt=cues[cue]
 folder=root/'.audio-generation'/cue
 folder.mkdir(parents=True,exist_ok=True)
 (folder/'prompt.txt').write_text(prompt+'\n')
 start=time.monotonic()
 subprocess.run(['stable',str(folder),'--seconds','5','--seed',str(seed),'--steps','8','--cfg','1.0'],check=True)
 print(f'{cue}: {time.monotonic()-start:.2f}s',flush=True)
