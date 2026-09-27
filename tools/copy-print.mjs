import { copyFile, mkdir } from 'node:fs/promises';
await mkdir('dist/print', { recursive: true });
await copyFile('print/flyerdungeon.html', 'dist/print/flyerdungeon.html');
