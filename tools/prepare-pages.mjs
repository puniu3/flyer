import { rm } from 'node:fs/promises';
for (const path of ['dist/audio-demo.html', 'dist/magic-demo.html', 'dist/assets/audio/magic-candidates']) {
  await rm(path, { recursive: true, force: true });
}
