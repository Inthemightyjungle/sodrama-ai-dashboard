// Checks assets/js/pace.js against pretend devices.  Run:  node tools/test_pace.mjs
import { createPace } from '../assets/js/pace.js';

const MIN_GAP = 10.6;   // the stage never draws more often than this (see stage3d.js)

// Plays `seconds` of a device whose frames cost cost(ratio, time) ms on a screen that refreshes every `refresh` ms.
function play({ refresh = 1000 / 60, cost, seconds = 60, start = 1.38, floor = 0.6 }) {
  const log = [];
  let struggled = 0;
  const pace = createPace({ start, floor, onStruggle: () => { struggled++; } });
  let now = 0;
  let lastDraw = 0;
  let busyUntil = 0;
  while (now < seconds * 1000) {
    now += refresh;
    pace.tick(refresh);
    if (now < busyUntil || now - lastDraw < MIN_GAP) continue;      // still drawing the last frame, or too soon
    const gap = now - lastDraw;
    lastDraw = now;
    busyUntil = now + cost(pace.ratio, now) - 0.01;
    const changed = pace.frame(gap, now);
    if (changed) log.push({ at: Math.round(now / 100) / 10, ratio: +changed.toFixed(3) });
  }
  return { ratio: +pace.ratio.toFixed(3), changes: log, struggled };
}

let failures = 0;
function check(name, result, test, expected) {
  const ok = test(result);
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ends at ${result.ratio}, ${result.changes.length} changes, struggled ${result.struggled}` + (ok ? '' : `   expected ${expected}\n     ${JSON.stringify(result.changes)}`));
}

check('fast laptop, 60 Hz screen', play({ cost: () => 5 }),
  (r) => r.ratio === 1.38 && r.changes.length === 0 && !r.struggled, 'no change');

check('fast laptop, 144 Hz screen', play({ refresh: 1000 / 144, cost: () => 5 }),
  (r) => r.ratio === 1.38 && r.changes.length === 0, 'no change');

check('fast laptop, 240 Hz screen', play({ refresh: 1000 / 240, cost: () => 6.8 }),
  (r) => r.ratio === 1.38 && r.changes.length === 0, 'no change');

check('graphics chip a little too slow', play({ cost: (r) => 4 + 9 * r * r, seconds: 120 }),
  (r) => r.ratio === 1.104 && r.changes.length <= 6 && !r.struggled, 'settles one step down, then stops trying');

check('graphics chip much too slow', play({ cost: (r) => 10 + 40 * r * r }),
  (r) => r.ratio === 0.6 && !r.struggled, 'settles at the softest setting');

check('screen that refreshes 30 times a second', play({ refresh: 1000 / 30, cost: () => 5, seconds: 400 }),
  (r) => r.ratio === 1.38 && r.changes.length <= 10 && !r.struggled, 'tries softer, sees no gain, goes back to sharp');

check('screen that refreshes 48 times a second', play({ refresh: 1000 / 48, cost: () => 5 }),
  (r) => r.ratio === 1.38 && r.changes.length === 0, 'no change');

check('screen that refreshes 50 times a second', play({ refresh: 1000 / 50, cost: () => 5 }),
  (r) => r.ratio === 1.38 && r.changes.length === 0, 'no change');

check('no graphics chip at all (software drawing)', play({ cost: () => 2500, seconds: 30 }),
  (r) => r.struggled >= 1, 'asks for still pictures');

check('crawls even at the softest setting', play({ cost: (r) => 60 + 10 * r * r, seconds: 40 }),
  (r) => r.struggled >= 1, 'asks for still pictures');

check('busy computer where fewer pixels do not help, and it crawls', play({ cost: () => 70, seconds: 40 }),
  (r) => r.struggled >= 1, 'asks for still pictures');

check('three busy seconds, then fine again', play({ cost: (r, t) => (t > 5000 && t < 8000 ? 40 : 5), seconds: 60 }),
  (r) => r.ratio === 1.38 && r.changes.length >= 2 && !r.struggled, 'softens during the busy spell, then returns to sharp');

check('one long hiccup', play({ cost: (r, t) => (t > 5000 && t < 5400 ? 400 : 5), seconds: 30 }),
  (r) => r.ratio === 1.38 && r.changes.length === 0 && !r.struggled, 'no change');

if (failures) { console.log(`\n${failures} failed`); process.exit(1); }
console.log('\nall good');
