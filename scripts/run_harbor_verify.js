#!/usr/bin/env node
/**
 * Harbor Range verify — one command, the whole battery, one verdict.
 *
 * Runs every check the package ships (unit tests, cage check, judge
 * demo, range week, same-seed control, adaptive scenario, negative
 * control, seed sweep) as child processes and prints one structured
 * summary. A check counts only on its own exit code plus its own PASS
 * line — the summary never upgrades a result. Full child output is
 * printed only for a failing check, so the failure is inspectable.
 */
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const node = process.execPath;

const CHECKS = [
  {
    id: 'test',
    label: 'unit tests (41)',
    argv: [
      '--test',
      'test/harbor.test.js',
      'test/attackers.test.js',
      'test/harbor_sim_preview.test.js',
      'test/harbor_bridge.test.js',
      'test/harbor_battle_buffs.test.js',
      'test/harbor_solo_loop.test.js',
    ],
    evidence: (out) => {
      const pass = /pass (\d+)/.exec(out)?.[1];
      const fail = /fail (\d+)/.exec(out)?.[1];
      return pass && fail ? `${pass} passed, ${fail} failed` : null;
    },
  },
  {
    id: 'attack',
    label: 'cage check (attack week, 10 conditions)',
    argv: ['scripts/run_harbor_cage_check.js'],
    evidence: (out) => (/GREEN: all 10 conditions hold\./.test(out) ? 'GREEN: all 10 conditions hold.' : null),
  },
  {
    id: 'judge',
    label: 'judge demo',
    argv: ['scripts/run_harbor_judge_demo.js', '--quiet'],
    evidence: (_out, err) => (/Harbor Judge Demo PASS/.test(err) ? 'Harbor Judge Demo PASS range=1 week=42 transfers=1' : null),
  },
  {
    id: 'range',
    label: 'range week (seed 1)',
    argv: ['scripts/run_harbor_range_sim.js', '1'],
    evidence: (out, err) => {
      try {
        const report = JSON.parse(out);
        return report.stallsSurvivedAttack === true && /Harbor Range PASS/.test(err)
          ? `stallsSurvivedAttack = true, openStalls = ${report.openStalls}`
          : null;
      } catch {
        return null;
      }
    },
  },
  {
    id: 'control',
    label: 'same-seed control (seed 1, no attackers)',
    argv: ['scripts/run_harbor_control_check.js'],
    evidence: (out) => (/Harbor Control PASS/.test(out) ? 'baseline openStalls = 2 vs attack week 1' : null),
  },
  {
    id: 'adaptive',
    label: 'adaptive raider scenario',
    argv: ['scripts/run_harbor_adaptive_check.js'],
    evidence: (_out, err) => {
      const line = /Harbor Adaptive PASS.*/.exec(err)?.[0];
      return line ?? null;
    },
  },
  {
    id: 'negative',
    label: 'negative control (partial payouts must fail)',
    argv: ['scripts/run_harbor_negative_check.js'],
    evidence: (out) => (/Negative Control PASS/.test(out) ? 'weakened run rejected: 2 reserve breaches' : null),
  },
  {
    id: 'sweep',
    label: 'seed sweep (seeds 1..100)',
    argv: ['scripts/run_harbor_seed_sweep.js'],
    evidence: (out) => {
      const line = /Harbor Seed Sweep PASS.*/.exec(out)?.[0];
      return line ?? null;
    },
  },
];

const results = [];
for (const check of CHECKS) {
  const run = spawnSync(node, check.argv, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  const stdout = run.stdout ?? '';
  const stderr = run.stderr ?? '';
  const evidence = run.status === 0 ? check.evidence(stdout, stderr) : null;
  const ok = run.status === 0 && evidence !== null;
  results.push({ check, ok, evidence, stdout, stderr, status: run.status });
}

console.log('Harbor Verify — battery summary');
for (const r of results) {
  console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.check.id.padEnd(9)} ${r.check.label} — ${r.evidence ?? `exit ${r.status}, PASS line not found`}`);
}
const failed = results.filter((r) => !r.ok);
if (failed.length > 0) {
  for (const r of failed) {
    console.log(`\n--- failing check: ${r.check.id} (exit ${r.status}) ---`);
    if (r.stdout) console.log(r.stdout);
    if (r.stderr) console.error(r.stderr);
  }
  console.log(`VERIFY FAIL: ${results.length - failed.length}/${results.length} checks green.`);
  process.exit(1);
}
console.log(`VERIFY PASS: ${results.length}/${results.length} checks green.`);
process.exit(0);
