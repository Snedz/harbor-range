import { createHarborSession, harborSell, settleHarborBatch } from './session.js';
import { createMockNearAdapter } from './near/adapter.js';
import { ATTACKER_IDS, runHarborRangeDay } from './attackers.js';

/** Fast-forward ~20 scripted traders for a week of harbor activity in-process. */

export const HARBOR_RANGE_DAYS = 7;
export const HARBOR_WEEK_TRADERS_PER_DAY = 20;
export const HARBOR_RANGE_TRADERS_PER_DAY = 12;

const SCRIPT = Object.freeze([
  { shipwright: 'ironmonger', good: 'iron', units: 2 },
  { shipwright: 'timberyard', good: 'timber', units: 3 },
  { shipwright: 'coinhouse', good: 'canvas', units: 1 },
  { shipwright: 'ironmonger', good: 'iron', units: 4 },
  { shipwright: 'timberyard', good: 'timber', units: 2 },
]);

export function normalizeHarborSimSeed(seed) {
  const n = Number(seed);
  if (!Number.isFinite(n)) return 1;
  return n >>> 0;
}

function createHarborRng(seed) {
  let rng = normalizeHarborSimSeed(seed);
  return () => {
    rng = (rng * 1664525 + 1013904223) >>> 0;
    return rng / 0x100000000;
  };
}

function runBackgroundTraders(session, next, tradersPerDay, salvageBonus = 0) {
  for (let trader = 0; trader < tradersPerDay; trader++) {
    const pick = SCRIPT[Math.floor(next() * SCRIPT.length)];
    session.player.salvage[pick.good] = (session.player.salvage[pick.good] ?? 0) + 1 + salvageBonus;
    harborSell(session, pick.shipwright, pick.good, pick.units);
  }
}

/** Validates one Harbor Range day report from `runHarborRangeDay`. */
export function validateHarborAttackReportEntry(entry, dayIndex) {
  const errors = [];
  const expected = ATTACKER_IDS[dayIndex % ATTACKER_IDS.length];
  if (!entry || typeof entry !== 'object') {
    return { ok: false, errors: [`attackReports[${dayIndex}] must be an object`] };
  }
  if (entry.attacker !== expected) {
    errors.push(`attackReports[${dayIndex}] must be attacker ${expected}`);
  }
  if (typeof entry.openStalls !== 'number' || entry.openStalls < 0) {
    errors.push(`attackReports[${dayIndex}].openStalls must be a non-negative number`);
  }
  if (!Array.isArray(entry.events) || entry.events.length < 1) {
    errors.push(`attackReports[${dayIndex}].events must be a non-empty array`);
  }
  if (expected === 'buy_everything') {
    if (typeof entry.attempts !== 'number' || entry.attempts < 1) {
      errors.push(`attackReports[${dayIndex}].attempts must be >= 1 for buy_everything`);
    }
  } else if (typeof entry.trades !== 'number' || entry.trades < 1) {
    errors.push(`attackReports[${dayIndex}].trades must be >= 1 for ${expected}`);
  }
  return { ok: errors.length === 0, errors };
}

export function validateHarborRangeReport(report) {
  const errors = [];
  if (!report || typeof report !== 'object') {
    return { ok: false, errors: ['report must be an object'] };
  }
  if (report.days !== HARBOR_RANGE_DAYS) errors.push(`days must be ${HARBOR_RANGE_DAYS}`);
  if (typeof report.seed !== 'number' || report.seed < 0) errors.push('seed must be a non-negative number');
  if (typeof report.playerCoin !== 'number' || report.playerCoin < 0) errors.push('playerCoin must be a non-negative number');
  if (typeof report.settlements !== 'number' || report.settlements < 1) errors.push('settlements must be >= 1');
  if (typeof report.openStalls !== 'number' || report.openStalls < 1) errors.push('openStalls must be >= 1');
  if (report.stallsSurvivedAttack !== true) errors.push('stallsSurvivedAttack must be true');
  if (!Array.isArray(report.attackReports) || report.attackReports.length !== HARBOR_RANGE_DAYS) {
    errors.push(`attackReports must have ${HARBOR_RANGE_DAYS} entries`);
  } else {
    for (let day = 0; day < HARBOR_RANGE_DAYS; day++) {
      const check = validateHarborAttackReportEntry(report.attackReports[day], day);
      if (!check.ok) errors.push(...check.errors);
    }
  }
  return { ok: errors.length === 0, errors };
}

/** Single-line verdict for the background-trader week sim (no attackers). */
export function formatHarborWeekSummary(report) {
  if (!report || typeof report !== 'object') {
    return 'Harbor Week FAIL invalid report';
  }
  if (typeof report.openStalls !== 'number' || report.openStalls < 1) {
    return `Harbor Week FAIL openStalls=${report.openStalls ?? 0}`;
  }
  return (
    `Harbor Week PASS openStalls=${report.openStalls} ` +
    `settlements=${report.settlements} playerCoin=${report.playerCoin}`
  );
}

/** Single-line verdict for judges and CI (stderr-friendly). */
export function formatHarborRangeSummary(report) {
  if (!report || typeof report !== 'object') {
    return 'Harbor Range FAIL invalid report';
  }
  const seed = report.seed ?? '?';
  if (report.stallsSurvivedAttack !== true) {
    return `Harbor Range FAIL seed=${seed} openStalls=${report.openStalls ?? 0}`;
  }
  return (
    `Harbor Range PASS seed=${seed} openStalls=${report.openStalls} ` +
    `settlements=${report.settlements} playerCoin=${report.playerCoin}`
  );
}

export function validateHarborWeekReport(report) {
  const errors = [];
  if (!report || typeof report !== 'object') {
    return { ok: false, errors: ['report must be an object'] };
  }
  if (report.days !== HARBOR_RANGE_DAYS) errors.push(`days must be ${HARBOR_RANGE_DAYS}`);
  if (typeof report.playerCoin !== 'number' || report.playerCoin < 0) errors.push('playerCoin must be a non-negative number');
  if (typeof report.settlements !== 'number' || report.settlements < 1) errors.push('settlements must be >= 1');
  if (typeof report.openStalls !== 'number' || report.openStalls < 1) errors.push('openStalls must be >= 1');
  return { ok: errors.length === 0, errors };
}

export function runHarborWeekSim(seed = 1) {
  const session = createHarborSession();
  const adapter = createMockNearAdapter({ network: 'testnet' });
  const next = createHarborRng(seed);

  for (let day = 0; day < HARBOR_RANGE_DAYS; day++) {
    runBackgroundTraders(session, next, HARBOR_WEEK_TRADERS_PER_DAY, day % 3);
    settleHarborBatch(session, adapter);
  }

  const report = {
    days: HARBOR_RANGE_DAYS,
    traders: HARBOR_WEEK_TRADERS_PER_DAY,
    playerCoin: session.player.coin,
    settlements: adapter.receipts.length,
    openStalls: session.shipwrights.filter((sw) => sw.open).length,
  };
  const validation = validateHarborWeekReport(report);
  if (!validation.ok) {
    throw new Error(`Harbor Week report invalid: ${validation.errors.join('; ')}`);
  }
  return report;
}

/** Harbor Range: week sim plus rotating attacker personas on the shipwright stalls. */
export function runHarborRangeSim(seed = 1) {
  const session = createHarborSession();
  const adapter = createMockNearAdapter({ network: 'testnet' });
  const next = createHarborRng(seed);

  const attackReports = [];
  for (let day = 0; day < HARBOR_RANGE_DAYS; day++) {
    attackReports.push(runHarborRangeDay(session, day));
    runBackgroundTraders(session, next, HARBOR_RANGE_TRADERS_PER_DAY);
    settleHarborBatch(session, adapter);
  }

  const openStalls = session.shipwrights.filter((sw) => sw.open).length;
  const report = {
    days: HARBOR_RANGE_DAYS,
    seed: normalizeHarborSimSeed(seed),
    playerCoin: session.player.coin,
    settlements: adapter.receipts.length,
    openStalls,
    stallsSurvivedAttack: openStalls >= 1,
    attackReports,
  };
  const validation = validateHarborRangeReport(report);
  if (!validation.ok) {
    throw new Error(`Harbor Range report invalid: ${validation.errors.join('; ')}`);
  }
  return report;
}
