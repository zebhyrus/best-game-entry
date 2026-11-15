// LUMEN MOTH — the hand-in program (Node 22, standard library only).
// It gathers this repository's game/ and screenshots/ into the output
// directory and writes the dossier the judge reads, using the vendored
// make.fun library. Run it as:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The scorer's own caps (from the kit's gate reference): the dossier
// text cap shapes the bytes, and the rest refuse an entry the scorer
// would refuse — too many screenshots, one over 256 KiB, or a game/
// over its file, byte or path limits.
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function repoRoot(): string {
  return fileURLToPath(new URL('.', import.meta.url));
}

function outputDir(): string {
  return process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
}

function copyTree(from: string, to: string): void {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

function handIn(): void {
  const root = repoRoot();
  const out = outputDir();

  mkdirSync(out, { recursive: true });
  copyTree(join(root, 'game'), join(out, 'game'));

  const shots = join(root, 'screenshots');
  if (existsSync(shots)) {
    copyTree(shots, join(out, 'screenshots'));
  }

  const dossier = buildDossier(out, DOSSIER_LIMITS);
  writeFileSync(join(out, 'dossier.json'), dossier);
}

handIn();
