/*
  Keeps the 3D stage smooth on whatever device it lands on.

  The stage reports how long each drawn frame really took. When frames arrive
  too slowly, the stage is drawn with fewer pixels: a little softer, a lot
  faster. If fewer pixels do not help, the slowness has another cause (a slow
  screen, a busy computer), so the sharpness is put back. After a calm spell it
  tries a sharper picture again. If the stage crawls whatever is tried, the
  page is told, and swaps the 3D stage for still pictures.

  Nothing here touches the page or the graphics card, so it can be tested on
  its own: node tools/test_pace.mjs
*/
export function createPace(options = {}) {
  const start = options.start || 1;
  const floor = Math.min(start, options.floor || 0.6);
  const step = options.step || 0.8;          // each step down draws about a third fewer pixels
  const slowAt = options.slow || 20.5;       // ms a frame: slower than this is under about 49 frames a second
  const crawlAt = options.crawl || 55;       // ms a frame: under about 18 frames a second
  const batch = options.batch || 40;         // frames judged together
  const rest = options.rest || 20;           // frames ignored after any change
  const firstWait = options.wait || 10000;   // ms of calm before trying a sharper picture

  const s = {
    ratio: start,
    frames: [],
    skip: options.warmup == null ? 45 : options.warmup,
    calmSince: 0,
    wait: firstWait,
    probing: false,
    probeFrom: start,
    ceiling: start,
    failed: 0,
    streakMean: 0,       // how slow it was when this run of steps down began
    streakRatio: start,  // and how sharp
    judged: false,
    quietUntil: 0,
    quietFor: 300000,
    crawls: 0,
    stalls: 0,
    fastest: Infinity,   // shortest gap between two screen refreshes seen lately
    ticks: 0,
  };

  function change(ratio) {
    s.ratio = ratio;
    s.frames.length = 0;
    s.skip = rest;
    return ratio;
  }

  function struggle() {
    s.crawls = 0;
    s.stalls = 0;
    if (options.onStruggle) options.onStruggle();
  }

  return {
    get ratio() { return s.ratio; },

    // Forget what was being measured. Call when drawing stops, resumes, or the window changes size.
    pause() {
      s.frames.length = 0;
      s.skip = rest;
      s.calmSince = 0;
      s.stalls = 0;
    },

    // Call on every screen refresh, drawn or not, with the gap since the last one.
    tick(ms) {
      if (!(ms > 2) || ms > 250) return;
      if (ms < s.fastest) s.fastest = ms;
      if (++s.ticks >= 240) {          // start the estimate afresh now and then, in case the screen changed
        s.ticks = 0;
        s.fastest = ms;
      }
    },

    // Call once per drawn frame with the time since the previous drawn frame.
    // Returns the new sharpness when it changes, otherwise 0.
    frame(ms, now) {
      if (!(ms > 0)) return 0;
      if (ms > 250) {
        // One long gap is a hiccup or a tab switch. Several in a row is a stage that cannot run here.
        s.frames.length = 0;
        s.skip = rest;
        s.calmSince = now;
        if (++s.stalls >= 4) struggle();
        return 0;
      }
      s.stalls = 0;
      if (!s.calmSince) s.calmSince = now;
      if (s.skip > 0) { s.skip--; return 0; }
      s.frames.push(ms);
      if (s.frames.length < batch) return 0;

      let sum = 0;
      for (let i = 0; i < batch; i++) sum += s.frames[i];
      const mean = sum / batch;
      s.frames.length = 0;

      // A screen that refreshes 40 to 50 times a second is not a slow stage.
      const limit = s.fastest > 19.5 && s.fastest < 25.5 ? Math.max(slowAt, s.fastest * 1.3) : slowAt;
      const slow = mean > limit;

      if (s.probing) {
        s.probing = false;
        s.calmSince = now;
        if (!slow) return 0;                       // the sharper picture holds
        s.failed++;                                // it does not: go back, and wait longer before trying again
        s.wait = Math.min(s.wait * 2, 120000);
        if (s.failed >= 2) s.ceiling = s.probeFrom;
        return change(s.probeFrom);
      }

      if (!slow) {
        s.streakMean = 0;
        s.crawls = 0;
        if (s.ratio < s.ceiling - 0.001 && now - s.calmSince > s.wait) {
          s.probing = true;
          s.probeFrom = s.ratio;
          return change(Math.min(s.ceiling, s.ratio / step));
        }
        return 0;
      }

      s.calmSince = now;
      const crawling = mean > crawlAt;
      if (now >= s.quietUntil) {
        if (!s.streakMean) { s.streakMean = mean; s.streakRatio = s.ratio; s.judged = false; }
        if (s.ratio > floor + 0.001) {
          return change(Math.max(floor, s.ratio * (mean > 34 ? step * step : step)));
        }
        // As soft as it goes. Did all those steps down buy anything?
        if (!s.judged) {
          s.judged = true;
          if (s.streakRatio > floor + 0.001 && mean > s.streakMean * 0.94) {
            // No: pixels were never the problem. Put the sharpness back and leave it alone for a while.
            const back = s.streakRatio;
            s.streakMean = 0;
            s.quietUntil = now + s.quietFor;
            s.quietFor = Math.min(s.quietFor * 12, 3600000);
            if (crawling && ++s.crawls >= 3) struggle();
            return change(back);
          }
        }
      }
      if (crawling) { if (++s.crawls >= 3) struggle(); } else s.crawls = 0;
      return 0;
    },
  };
}
