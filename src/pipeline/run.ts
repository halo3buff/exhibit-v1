// src/pipeline/run.ts
// Unified pipeline runner — orchestrates harvest → transform → validate → load
// for one or all sources without chaining npm scripts manually.
//
// Usage:
//   pnpm pipeline:run                          # all sources, all stages
//   pnpm pipeline:run --source met             # one source, all stages
//   pnpm pipeline:run --source met --stage harvest
//   pnpm pipeline:run --stage load             # load stage only, all sources

import { execSync } from 'child_process';

type Stage = 'harvest' | 'transform' | 'validate' | 'load' | 'all';

interface Source {
  id:        string;
  harvest:   string;
  transform: string;
  load:      string;
}

const SOURCES: Source[] = [
  { id: 'met',           harvest: 'harvest:met',           transform: 'transform',               load: 'load' },
  { id: 'artic',         harvest: 'harvest:artic',         transform: 'transform',               load: 'load' },
  { id: 'va',            harvest: 'harvest:va',            transform: 'transform',               load: 'load' },
  { id: 'rijks',         harvest: 'harvest:rijks',         transform: 'transform',               load: 'load' },
  { id: 'smithsonian',   harvest: 'harvest:smithsonian',   transform: 'transform',               load: 'load' },
  { id: 'cooperhewitt',  harvest: 'harvest:cooperhewitt',  transform: 'transform',               load: 'load' },
  { id: 'designarchive', harvest: 'harvest:designarchive', transform: 'transform:designarchive', load: 'load:designarchive' },
];

const args = process.argv.slice(2);

function getArg(flag: string): string | null {
  const i = args.indexOf(flag);
  return i !== -1 ? (args[i + 1] ?? null) : null;
}

const sourceArg = getArg('--source');
const stageArg  = (getArg('--stage') ?? 'all') as Stage;

const validStages: Stage[] = ['harvest', 'transform', 'validate', 'load', 'all'];
if (!validStages.includes(stageArg)) {
  console.error(`Unknown stage: ${stageArg}. Valid stages: ${validStages.join(', ')}`);
  process.exit(1);
}

const targets = sourceArg
  ? SOURCES.filter(s => s.id === sourceArg)
  : SOURCES;

if (sourceArg && targets.length === 0) {
  const valid = SOURCES.map(s => s.id).join(', ');
  console.error(`Unknown source: ${sourceArg}. Valid sources: ${valid}`);
  process.exit(1);
}

function run(script: string): void {
  console.log(`\n  → pnpm ${script}`);
  execSync(`pnpm ${script}`, { stdio: 'inherit' });
}

const shouldRun = (stage: Exclude<Stage, 'all'>) =>
  stageArg === 'all' || stageArg === stage;

for (const source of targets) {
  console.log(`\n══ ${source.id.toUpperCase()} ══════════════════════════════`);
  if (shouldRun('harvest'))   run(source.harvest);
  if (shouldRun('transform')) run(source.transform);
  if (shouldRun('validate'))  run('validate');
  if (shouldRun('load'))      run(source.load);
}

console.log('\n✓ Pipeline complete.');
