import { readdir, readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const audio = JSON.parse(await readFile('art/audio/encoded.json', 'utf8'));
for (const [cue, entry] of Object.entries(audio)) {
  for (const [path, hash] of [
    [`public/assets/audio/${cue}.wav`, entry.source_sha256],
    [`src/assets/audio/${cue}.mp3`, entry.sha256],
  ]) {
    assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'), hash, `Re-encode audio: ${cue}`);
  }
}
for (const path of ['dist/audio-demo.html', 'dist/magic-demo.html', 'dist/assets/audio']) {
  await rm(path, { recursive: true, force: true });
}
for (const name of await readdir('dist/assets/toys')) {
  if (name.endsWith('.png') || name.endsWith('.manifest.json')) await rm(`dist/assets/toys/${name}`);
}
