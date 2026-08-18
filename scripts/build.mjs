import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

const files = [
  'index.html',
  'impressum.html',
  'datenschutz.html',
  '404.html',
  'ski.css',
  'ski.js',
  'sw.js',
  'manifest.webmanifest',
];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const file of files) {
  await cp(join(root, file), join(dist, file));
}

async function copyDir(src, dest) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name.startsWith('._')) continue;
    const from = join(src, entry.name);
    const to = join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(from, to);
    else await cp(from, to);
  }
}

await copyDir(join(root, 'icons'), join(dist, 'icons'));
await copyDir(join(root, 'fonts'), join(dist, 'fonts'));

await writeFile(
  join(dist, 'serve.json'),
  JSON.stringify({ cleanUrls: true, trailingSlash: false }, null, 2) + '\n'
);

async function removeAppleDouble(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const target = join(dir, entry.name);
    if (entry.name.startsWith('._') || entry.name === '.DS_Store') {
      await rm(target, { recursive: true, force: true });
      continue;
    }
    if (entry.isDirectory()) await removeAppleDouble(target);
  }
}

await removeAppleDouble(dist);

console.log('Produktions-Build geschrieben nach dist/');
