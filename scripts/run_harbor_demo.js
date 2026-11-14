#!/usr/bin/env node
/** One judge command: hackathon gates + headless solo→harbor bridge proof. */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(label, cmd, args, quiet) {
  const proc = spawnSync(cmd, args, {
    cwd: root,
    encoding: 'utf8',
    // Piped stdio can deadlock nested `npm run` chains when buffers fill.
    stdio: quiet ? 'ignore' : 'inherit',
  });
  if (proc.status !== 0) {
    console.error(`Harbor Demo FAIL at ${label}`);
    process.exit(proc.status ?? 1);
  }
  return proc;
}

const quiet = process.argv.includes('--check');

run('harbor:hackathon:check', 'npm', ['run', 'harbor:hackathon:check'], quiet);
run('harbor_bridge.test', process.execPath, ['--test', 'test/harbor_bridge.test.js'], quiet);

console.error('Harbor Demo PASS hackathon=1 bridge=1');
