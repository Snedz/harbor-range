import { emptySalvage } from './salvage.js';
import { harborBuyUpgrade, harborSell } from './session.js';
import { UPGRADES } from './constants.js';

/** Harbor Range personas — scripted stress on NPC shipwright stalls (chain-free). */

export const ATTACKER_IDS = Object.freeze(['iron_flooder', 'wash_trader', 'buy_everything']);

function botTrader(id) {
  return { id, salvage: emptySalvage(), coin: 0, upgrades: [] };
}

export function createAttackerBot(id) {
  const bot = botTrader(id);
  if (id === 'iron_flooder') {
    bot.salvage.iron = 240;
    bot.salvage.timber = 4;
  } else if (id === 'wash_trader') {
    bot.salvage.timber = 80;
    bot.salvage.canvas = 80;
  } else if (id === 'buy_everything') {
    bot.coin = 500;
  } else {
    throw new Error(`unknown attacker: ${id}`);
  }
  return bot;
}

function countOpenStalls(session) {
  return session.shipwrights.filter((sw) => sw.open).length;
}

/** Dump iron on Ironmonger until the stall breaks or the bot runs dry. */
export function runIronFlooder(session, bot) {
  const events = [];
  let trades = 0;
  for (let i = 0; i < 24 && bot.salvage.iron > 0; i++) {
    const before = countOpenStalls(session);
    const result = harborSell(session, 'ironmonger', 'iron', Math.min(12, bot.salvage.iron), bot);
    trades += 1;
    events.push({ ok: result.ok, error: result.error ?? null, openStalls: countOpenStalls(session) });
    if (countOpenStalls(session) < before) break;
  }
  return { attacker: 'iron_flooder', trades, openStalls: countOpenStalls(session), events };
}

/** Rapid timber/canvas sells to Timberyard — wash-style volume without player coin. */
export function runWashTrader(session, bot) {
  const events = [];
  let trades = 0;
  const pattern = [
    ['timberyard', 'timber', 6],
    ['timberyard', 'canvas', 4],
    ['timberyard', 'timber', 8],
    ['timberyard', 'canvas', 6],
  ];
  for (let round = 0; round < 6; round++) {
    for (const [sw, good, units] of pattern) {
      if ((bot.salvage[good] ?? 0) < units) continue;
      const result = harborSell(session, sw, good, units, bot);
      trades += 1;
      events.push({ ok: result.ok, good, openStalls: countOpenStalls(session) });
    }
  }
  return { attacker: 'wash_trader', trades, openStalls: countOpenStalls(session), events };
}

/** Prompt-injected agent tries to buy every upgrade in one pass (spend guard should block real keys). */
export function runBuyEverything(session, bot) {
  session.player.coin += bot.coin;
  bot.coin = 0;
  const events = [];
  let attempts = 0;
  for (const upgrade of UPGRADES) {
    const sw = upgrade.id === 'skiff' ? 'timberyard' : 'ironmonger';
    const result = harborBuyUpgrade(session, sw, upgrade.id);
    attempts += 1;
    events.push({ upgrade: upgrade.id, ok: result.ok, error: result.error ?? null });
  }
  return { attacker: 'buy_everything', attempts, openStalls: countOpenStalls(session), events };
}

export function runHarborRangeDay(session, dayIndex) {
  const attackerId = ATTACKER_IDS[dayIndex % ATTACKER_IDS.length];
  const bot = createAttackerBot(attackerId);
  if (attackerId === 'iron_flooder') return runIronFlooder(session, bot);
  if (attackerId === 'wash_trader') return runWashTrader(session, bot);
  return runBuyEverything(session, bot);
}
