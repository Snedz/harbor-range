import { newShots } from '../engine.js';
import { buildHarborBattleBuffs } from './battle_buffs.js';
import {
  getActiveHarborUpgrades,
  getHarborSummary,
  onLocalMatchEnd,
  resetHarborSession,
  sellHarborSalvage,
  tryHarborBuyUpgrade,
} from '../harbor_bridge.js';

const SONAR_COST = 12;
const MAX_SELLS = 24;

/** Headless Nov 9 acceptance: duel salvage → harbor sell → buy sonar → next-duel buff. */
export function runHarborSoloLoopProof() {
  resetHarborSession();
  const shots = newShots();
  shots.set('0,0', 'hit');
  shots.set('1,1', 'sunk');
  shots.set('2,2', 'hit');
  shots.set('3,3', 'sunk');
  shots.set('4,4', 'hit');
  shots.set('5,5', 'sunk');

  const docked = onLocalMatchEnd({ foe: { shots } });
  if (!docked) {
    return { ok: false, step: 'dock', error: 'onLocalMatchEnd returned null' };
  }

  const sellRoutes = [
    ['ironmonger', 'iron'],
    ['coinhouse', 'iron'],
    ['coinhouse', 'timber'],
    ['coinhouse', 'canvas'],
    ['timberyard', 'timber'],
    ['timberyard', 'canvas'],
  ];

  let sells = 0;
  let route = 0;
  while (getHarborSummary().coin < SONAR_COST && sells < MAX_SELLS) {
    const summary = getHarborSummary();
    let sold = false;
    for (let attempt = 0; attempt < sellRoutes.length; attempt += 1) {
      const [sw, good] = sellRoutes[(route + attempt) % sellRoutes.length];
      if ((summary.salvage[good] ?? 0) < 1) continue;
      const sell = sellHarborSalvage(sw, good, 1);
      if (sell.ok) {
        sells += 1;
        route = (route + attempt + 1) % sellRoutes.length;
        sold = true;
        break;
      }
    }
    if (!sold) {
      return { ok: false, step: 'sell', error: 'no shipwright would buy salvage for coin' };
    }
  }
  if (getHarborSummary().coin < SONAR_COST) {
    return { ok: false, step: 'sell', error: `coin ${getHarborSummary().coin} < ${SONAR_COST}` };
  }

  const buy = tryHarborBuyUpgrade('ironmonger', 'sonar');
  if (!buy.ok) {
    return { ok: false, step: 'buy', error: buy.error || 'sonar purchase failed' };
  }

  const upgrades = getActiveHarborUpgrades();
  const buffs = buildHarborBattleBuffs(upgrades);
  if (!buffs.sonar) {
    return { ok: false, step: 'buffs', error: 'sonar not in battle buffs' };
  }

  return {
    ok: true,
    sells,
    coin: getHarborSummary().coin,
    upgrades: upgrades.slice(),
    buffs: { sonar: buffs.sonar, armorPlate: buffs.armorPlate },
  };
}

export function formatHarborSoloLoopSummary(result) {
  if (!result?.ok) {
    const step = result?.step ?? 'unknown';
    const err = result?.error ?? 'failed';
    return `Harbor Solo Loop FAIL step=${step} ${err}`;
  }
  return (
    'Harbor Solo Loop PASS dock=1 sells=' +
    result.sells +
    ' buy=sonar next_duel_buff=sonar coin=' +
    result.coin
  );
}
