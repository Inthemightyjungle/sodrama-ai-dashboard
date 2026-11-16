/* So Drama! Entertainment: AI Solutions Dashboard */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var smooth = function (a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  var calm = root.classList.contains('calm');
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var tallQuery = window.matchMedia ? window.matchMedia('(max-aspect-ratio: 21/20), (max-width: 860px)') : { matches: false };

  var ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"></path></svg>';
  var WARN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 2.8 20h18.4L12 4zM12 10v4.5M12 17.6v.2"></path></svg>';

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  /* ---------- AI Dispatch ---------- */

  function shortDay(iso) {
    var d = new Date(iso + 'T12:00:00');
    return isNaN(d) ? iso : d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' });
  }

  function renderNews() {
    var data = window.SD_NEWS;
    var host = $('[data-news]');
    if (!host || !data || !data.stories) return;
    var thumbs = window.SD_NEWS_THUMBS || {};

    host.innerHTML = data.stories.map(function (s, i) {
      var lead = i === 0;
      var caution = s.kind === 'caution';
      var t = thumbs[s.id];
      var picture = t && t.src
        ? '<img src="' + esc(t.src) + (t.v ? '?v=' + esc(t.v) : '') + '" width="' + esc(t.w) + '" height="' + esc(t.h) + '" alt="" loading="lazy" decoding="async">' +
          '<span class="story-credit">' + esc(s.credit || ('Image: ' + s.source)) + '</span>'
        : '<img src="assets/img/posters/' + (caution ? 'news-caution' : 'news-update') + '.webp" width="960" height="600" alt="" loading="lazy" decoding="async">' +
          '<span class="story-stand">' + esc(s.source) + '</span>';
      return '<article class="story' + (lead ? ' is-lead' : '') + (caution ? ' is-caution' : '') + '" data-reveal style="--rd:' + (lead ? 0 : (i - 1) * 0.05).toFixed(2) + 's">' +
        '<div class="story-thumb">' + picture + '</div>' +
        '<div class="story-body">' +
          '<p class="story-tags">' + (caution ? '<span class="tag tag-caution">' + WARN + 'Word of caution</span>' : '') + '<span class="tag">' + esc(s.category) + '</span></p>' +
          '<h3 class="story-title"><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.title) +
            '<span class="sr-only"> (opens ' + esc(s.source) + ' in a new tab)</span></a></h3>' +
          '<p class="story-summary">' + esc(s.summary) + '</p>' +
          '<p class="story-meta"><span class="story-source">' + esc(s.source) + ARROW + '</span><time datetime="' + esc(s.date) + '">' + esc(shortDay(s.date)) + '</time></p>' +
        '</div>' +
      '</article>';
    }).join('');

    var edition = $('[data-news-edition]');
    var updated = new Date(data.updated);
    if (edition && !isNaN(updated)) {
      var day = updated.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Singapore' });
      var stale = Date.now() - updated.getTime() > 36 * 3600 * 1000;
      edition.textContent = (stale ? 'Last updated ' : 'Updated ') + day;
      if (stale) edition.parentNode.classList.add('is-stale');
    }
  }

  /* ---------- apps ---------- */

  function coverHTML(c) {
    if (!c) return '';
    if (c.type === 'layers') {
      return '<img class="cover-img cover-zoom" src="' + esc(c.background) + '" alt="" loading="lazy" decoding="async">' +
        '<img class="cl-logo' + (c.pixelated ? ' pixel' : '') + '" src="' + esc(c.logo) + '" alt="" loading="lazy" decoding="async">';
    }
    return '<img class="cover-img cover-zoom' + (c.pixelated ? ' pixel' : '') + '" src="' + esc(c.src) + '" alt="" loading="lazy" decoding="async" style="object-position:' + esc(c.position || 'center') + '">';
  }

  function renderApps() {
    var apps = window.SD_APPS;
    var grid = $('[data-apps]');
    var tabs = $('[data-tabs]');
    if (!apps || !grid) return;

    grid.innerHTML = apps.map(function (a, i) {
      return '<article class="app" data-cat="' + esc(a.category) + '" data-reveal style="--rd:' + ((i % 3) * 0.06).toFixed(2) + 's">' +
        '<div class="app-cover" aria-hidden="true">' + coverHTML(a.cover) + '<span class="app-glare"></span></div>' +
        '<p class="app-kicker"><span class="app-type">' + esc(a.category) + '</span>' + esc(a.meta) + '</p>' +
        '<h3 class="app-name">' + esc(a.name) + '</h3>' +
        (a.description ? '<p class="app-desc">' + esc(a.description) + '</p>' : '') +
        '<span class="app-action-gap"></span>' +
        '<a class="btn btn-solid app-action" href="' + esc(a.url) + '" target="_blank" rel="noopener">' + esc(a.action) + ARROW +
          '<span class="sr-only">: ' + esc(a.name) + ', opens in a new tab</span></a>' +
      '</article>';
    }).join('');

    if (!tabs) return;
    var pill = $('[data-tabs-pill]', tabs);
    var cats = ['All'];
    apps.forEach(function (a) { if (cats.indexOf(a.category) < 0) cats.push(a.category); });
    cats.forEach(function (c) {
      var count = c === 'All' ? apps.length : apps.filter(function (a) { return a.category === c; }).length;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tab';
      b.setAttribute('aria-pressed', c === 'All' ? 'true' : 'false');
      b.setAttribute('data-cat', c);
      b.innerHTML = esc(c) + '<span class="tab-count">' + count + '</span>';
      tabs.appendChild(b);
    });

    function movePill(btn, instant) {
      if (!pill || !btn) return;
      if (instant) pill.style.transition = 'none';
      pill.style.width = btn.offsetWidth + 'px';
      pill.style.height = btn.offsetHeight + 'px';
      pill.style.transform = 'translate(' + btn.offsetLeft + 'px,' + btn.offsetTop + 'px)';
      if (instant) { void pill.offsetWidth; pill.style.transition = ''; }
    }
    function current() { return $('.tab[aria-pressed="true"]', tabs); }

    function filter(cat) {
      var cards = $$('.app', grid);
      var before = cards.map(function (c) { return c.getBoundingClientRect(); });
      var wasHidden = cards.map(function (c) { return c.classList.contains('is-hidden'); });
      cards.forEach(function (c) {
        c.classList.toggle('is-hidden', !(cat === 'All' || c.getAttribute('data-cat') === cat));
        c.removeAttribute('data-reveal');
      });
      if (calm || !cards.length || !cards[0].animate) return;
      cards.forEach(function (c, i) {
        if (c.classList.contains('is-hidden')) return;
        if (wasHidden[i]) {
          c.animate([{ opacity: 0, transform: 'translateY(26px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 600, easing: 'cubic-bezier(.16,1,.3,1)' });
          return;
        }
        var after = c.getBoundingClientRect();
        var dx = before[i].left - after.left;
        var dy = before[i].top - after.top;
        if (dx || dy) c.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)' });
      });
      requestMeasure();
    }

    tabs.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.tab') : null;
      if (!b || b.getAttribute('aria-pressed') === 'true') return;
      $$('.tab', tabs).forEach(function (t) { t.setAttribute('aria-pressed', t === b ? 'true' : 'false'); });
      movePill(b);
      filter(b.getAttribute('data-cat'));
    });
    movePill(current(), true);
    window.addEventListener('resize', function () { movePill(current(), true); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { movePill(current(), true); });

    // Covers lean towards the pointer.
    if (!calm && finePointer) {
      $$('.app', grid).forEach(function (card) {
        var cover = $('.app-cover', card);
        card.addEventListener('pointermove', function (e) {
          var r = cover.getBoundingClientRect();
          var x = clamp((e.clientX - r.left) / r.width, 0, 1);
          var y = clamp((e.clientY - r.top) / r.height, 0, 1);
          cover.style.setProperty('--ry', ((x - 0.5) * 12).toFixed(2) + 'deg');
          cover.style.setProperty('--rx', ((0.5 - y) * 9).toFixed(2) + 'deg');
          cover.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
          cover.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
        });
        card.addEventListener('pointerleave', function () {
          cover.style.setProperty('--rx', '0deg');
          cover.style.setProperty('--ry', '0deg');
        });
      });
    }
  }

  /* ---------- things that arrive as you scroll ---------- */

  function setupReveal() {
    var items = $$('[data-reveal]');
    if (calm || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.removeAttribute('data-reveal'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        io.unobserve(el);
        el.classList.add('is-in');
        // Once it has arrived, hand the element back to its normal hover behaviour.
        setTimeout(function () {
          el.removeAttribute('data-reveal');
          el.classList.remove('is-in');
        }, 1500);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- scrolling: one place that works out where you are ---------- */

  /*
    update() runs on every scroll frame, so it only does sums. Everything it
    needs to know about the layout is measured once, in measure(), and it
    changes the style of one small element at a time. Reading the layout here,
    or setting a variable on the whole page, would make the browser work out
    the entire page again on every frame.
  */

  var CUE_NAMES = ['Start', 'Step 1 of 4', 'Step 2 of 4', 'Step 3 of 4', 'Step 4 of 4', 'AI news', 'Apps'];
  var stage = null;
  var staged = false;      // true once the 3D stage is drawing
  var scenes = [];
  var tickers = [];
  var m = { vh: 1, max: 1, news: 0, apps: 0, cta: 0 };
  var state = { p: 0, cue: -1, y: -1, drift: 0, last: 0, chipOn: null, stuck: null, hasCta: null };
  var els = {};
  var measureQueued = false;
  var chipQuery = window.matchMedia ? window.matchMedia('(max-width: 1000px)') : { matches: true };

  function docTop(el) { return el ? el.getBoundingClientRect().top + window.pageYOffset : 0; }
  // Where an element sits on the page, not counting any shift this script has given it.
  function layoutTop(el) {
    var y = 0;
    while (el) { y += el.offsetTop; el = el.offsetParent; }
    return y;
  }

  function measure() {
    measureQueued = false;
    m.vh = window.innerHeight;
    m.max = Math.max(1, document.documentElement.scrollHeight - m.vh);
    scenes = $$('[data-scene]').map(function (el, i) {
      var r = el.getBoundingClientRect();
      var body = $('[data-scene-body]', el);
      var was = scenes[i] || {};
      return {
        body: body,
        focus: i === 0 ? 0 : r.top + window.pageYOffset + r.height / 2 - m.vh / 2,
        top: body ? layoutTop(body) : 0,
        height: body ? body.offsetHeight : 0,
        o: was.o,
        ty: was.ty,
      };
    });
    m.news = docTop($('#news'));
    m.apps = docTop($('#apps'));
    var cta = $('[data-cta]');
    m.cta = cta ? docTop(cta) + cta.offsetHeight : 0;
    tickers.forEach(function (t) {
      t.top = docTop(t.el);
      t.loop = t.row.scrollWidth / Math.max(1, t.row.children.length / 2);
    });
    state.y = -1;
    update();
  }
  function requestMeasure() {
    if (measureQueued) return;
    measureQueued = true;
    requestAnimationFrame(measure);
  }

  function update() {
    var y = window.pageYOffset;
    if (y === state.y) return;
    state.y = y;
    var along = clamp(y / m.max, 0, 1);
    if (els.bar) els.bar.style.transform = 'scaleX(' + along.toFixed(4) + ')';
    if (els.arc && chipQuery.matches) els.arc.style.strokeDashoffset = (100 - along * 100).toFixed(1);

    // Which set is on stage: 0 is the opening screen, 1 to 4 are the steps.
    var p = 0;
    for (var i = 0; i < scenes.length - 1; i++) {
      var a = scenes[i].focus;
      var b = scenes[i + 1].focus;
      if (y >= b) { p = i + 1; continue; }
      if (y > a) p = i + (y - a) / (b - a);
      break;
    }
    state.p = p;
    if (stage) stage.setProgress(p);

    // Words fade in as their set arrives and out as it leaves.
    if (staged) {
      var tall = tallQuery.matches;
      var drift = tall ? 18 : 46;   // how far, in pixels, the words travel as they pass
      for (var j = 0; j < scenes.length; j++) {
        var s = scenes[j];
        if (!s.body) continue;
        var top = s.top - y;
        if (top + s.height < -200 || top > m.vh + 200) continue;
        // Where the middle of the words sits in the window: 0 at the top edge, 1 at the bottom,
        // allowing for the little drift they are given below.
        var mid = ((top + s.height / 2) / m.vh + 0.5 * drift / m.vh) / (1 + drift / m.vh);
        var o = (tall
          ? smooth(1.06, 0.9, mid) * (1 - smooth(0.62, 0.44, mid))
          : smooth(1.04, 0.82, mid) * (1 - smooth(0.24, 0.04, mid))).toFixed(3);
        var ty = ((0.5 - mid) * drift).toFixed(1);
        if (o !== s.o) { s.o = o; s.body.style.opacity = o; }
        if (ty !== s.ty) { s.ty = ty; s.body.style.transform = 'translate3d(0,' + ty + 'px,0)'; }
      }
    }

    // The rail on the right, the chip on small screens and the menu at the top.
    var last = scenes.length ? scenes[scenes.length - 1].focus : 0;
    var newsAt = Math.max(last + 1, m.news - m.vh * 0.5);
    var appsAt = Math.max(newsAt + 1, m.apps - m.vh * 0.5);
    var where = y >= appsAt ? 6 : y >= newsAt ? 5 + (y - newsAt) / (appsAt - newsAt) : y > last ? 4 + (y - last) / (newsAt - last) : p;
    var cue = y >= appsAt ? 6 : y >= newsAt ? 5 : Math.round(p);
    if (els.fill) els.fill.style.transform = 'scaleY(' + (where / 6).toFixed(4) + ')';
    if (cue !== state.cue) {
      state.cue = cue;
      els.cues.forEach(function (c, n) {
        c.classList.toggle('is-active', n === cue);
        c.classList.toggle('is-done', n < cue);
        if (n === cue) c.setAttribute('aria-current', 'true'); else c.removeAttribute('aria-current');
      });
      if (els.rail) els.rail.classList.toggle('is-quiet', cue >= 5);
      if (els.chipText) els.chipText.textContent = CUE_NAMES[cue];
      els.nav.forEach(function (link) {
        var key = link.getAttribute('data-nav');
        link.classList.toggle('is-active', (key === 'process' && cue >= 1 && cue <= 4) || (key === 'news' && cue === 5) || (key === 'apps' && cue === 6));
      });
    }
    var chipOn = y > 60 && y < m.max - 30;
    if (chipOn !== state.chipOn) { state.chipOn = chipOn; if (els.chip) els.chip.classList.toggle('is-on', chipOn); }
    var stuck = y > 14;
    if (stuck !== state.stuck) { state.stuck = stuck; if (els.top) els.top.classList.toggle('is-stuck', stuck); }
    var hasCta = y > m.cta - 70;
    if (hasCta !== state.hasCta) { state.hasCta = hasCta; if (els.top) els.top.classList.toggle('has-cta', hasCta); }
  }

  // The two bands of big type drift on their own and run faster while you scroll.
  // They only do any work while one of them is on screen.
  var tickerFrame = 0;
  function placeTickers() {
    var y = state.y < 0 ? window.pageYOffset : state.y;
    for (var i = 0; i < tickers.length; i++) {
      var t = tickers[i];
      if (!t.on || !t.loop) continue;
      var travel = (state.drift + (y + m.vh - t.top) * 0.55) % t.loop;
      if (travel < 0) travel += t.loop;
      t.row.style.transform = 'translate3d(' + (t.dir < 0 ? -travel : travel - t.loop).toFixed(1) + 'px,0,0)';
    }
  }
  function runTickers(now) {
    tickerFrame = 0;
    var gap = state.last ? now - state.last : 0;
    if (!state.last || gap >= 10.6) {     // on very fast screens every second refresh is plenty
      state.drift += Math.min(0.05, gap / 1000) * 26;
      state.last = now;
      placeTickers();
    }
    wakeTickers();
  }
  function wakeTickers() {
    if (tickerFrame || calm || document.hidden) return;
    for (var i = 0; i < tickers.length; i++) {
      if (tickers[i].on) { tickerFrame = requestAnimationFrame(runTickers); return; }
    }
    state.last = 0;
  }
  function watchTickers() {
    if (calm) return;
    if (!('IntersectionObserver' in window)) {
      tickers.forEach(function (t) { t.on = true; });
      wakeTickers();
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        tickers.forEach(function (t) { if (t.el === entry.target) t.on = entry.isIntersecting; });
      });
      wakeTickers();
    }, { rootMargin: '120px 0px 120px 0px' });
    tickers.forEach(function (t) { io.observe(t.el); });
    document.addEventListener('visibilitychange', wakeTickers);
  }

  /* ---------- the 3D stage ---------- */

  // For testing: ?3d keeps the stage on, at full sharpness, even on a device that draws it slowly.
  var force3d = /[?&]3d\b/.test(location.search);

  function frameStage() {
    if (!stage) return;
    stage.setFraming(tallQuery.matches
      ? { right: 0, up: 0.2, fillHeight: 0.42, fillWidth: 0.96 }
      : { right: 0.225, up: -0.02, fillHeight: 0.66, fillWidth: 0.5 });
  }

  // Swaps the 3D stage for still pictures. With keepPlace, the reader stays at the step they were on.
  function goStill(keepPlace) {
    var here = keepPlace && staged && window.pageYOffset < m.news - m.vh ? Math.round(state.p) : 0;
    staged = false;
    if (stage) { stage.run(false); stage = null; }
    root.classList.remove('stage-pending', 'stage-on');
    root.classList.add('still');
    $$('[data-scene-body]').forEach(function (b) { b.style.opacity = ''; b.style.transform = ''; });
    scenes.forEach(function (s) { s.o = s.ty = undefined; });
    if (here > 0) {
      // The page is laid out differently without the stage.
      var el = $$('[data-scene]')[here];
      if (el) window.scrollTo({ top: Math.max(0, docTop(el) - 90), behavior: 'instant' });
    }
    requestMeasure();
  }

  function startStage(api) {
    var canvas = $('[data-stage]');
    var act = $('[data-act]');
    var onStage = true;
    function sync() { if (stage) stage.run(onStage && !document.hidden); }

    api.createStage(canvas, {
      adaptive: !force3d,
      onFirstFrame: function () {
        root.classList.add('stage-on');
        root.classList.remove('stage-pending');
      },
      onStruggle: function () {
        if (force3d) return;
        if (window.console) console.info('The 3D stage is too slow on this device, so the page is showing still pictures instead.');
        setTimeout(function () { goStill(true); }, 0);
      },
    }).then(function (made) {
      stage = made;
      staged = true;
      window.sdStage = made;
      frameStage();
      stage.setProgress(state.p);
      stage.jump();
      state.y = -1;
      update();
      if ('IntersectionObserver' in window && act) {
        new IntersectionObserver(function (entries) { onStage = entries[0].isIntersecting; sync(); }, { rootMargin: '10% 0px 10% 0px' }).observe(act);
      }
      document.addEventListener('visibilitychange', sync);
      // If the graphics context is lost and does not come back, fall back to the still pictures.
      var lostTimer = 0;
      canvas.addEventListener('webglcontextlost', function () { lostTimer = setTimeout(goStill, 4000); });
      canvas.addEventListener('webglcontextrestored', function () { clearTimeout(lostTimer); });
      if (tallQuery.addEventListener) tallQuery.addEventListener('change', function () { frameStage(); requestMeasure(); });
      if (finePointer) {
        window.addEventListener('pointermove', function (e) {
          if (stage) stage.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
        }, { passive: true });
      }
      sync();
    }).catch(function (err) {
      if (window.console) console.warn('The 3D stage could not start, showing still pictures instead.', err);
      goStill();
    });
  }

  function bootStage() {
    if (!root.classList.contains('stage-pending')) { goStill(); return; }
    var settled = false;
    function settle() {
      if (settled) return;
      settled = true;
      if (window.SD_STAGE && window.SD_STAGE.createStage) startStage(window.SD_STAGE);
      else goStill();
    }
    if (window.SD_STAGE !== undefined) settle();
    else {
      document.addEventListener('sd-stage', settle);
      setTimeout(settle, 15000);
    }
  }

  /* ---------- start ---------- */

  function safely(fn) { try { fn(); } catch (err) { if (window.console) console.error(err); } }

  function init() {
    els.cues = $$('[data-cue]');
    els.rail = $('[data-cues]');
    els.fill = $('[data-cues-fill]');
    els.nav = $$('[data-nav]');
    els.chip = $('[data-chip]');
    els.chipText = $('[data-chip-text]');
    els.arc = $('[data-chip-arc]');
    els.top = $('[data-top]');
    els.bar = $('[data-progress]');
    tickers = $$('[data-ticker]').map(function (el) {
      return { el: el, row: $('.ticker-row', el), dir: parseFloat(el.getAttribute('data-ticker')) || -1, top: 0, loop: 0, on: false };
    });

    safely(renderNews);
    safely(renderApps);
    safely(setupReveal);
    safely(measure);
    safely(watchTickers);

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; update(); });
    }, { passive: true });

    var width = window.innerWidth;
    window.addEventListener('resize', function () {
      // Phones resize the window as their toolbars slide away; only a real change needs a re-measure.
      if (window.innerWidth === width && Math.abs(window.innerHeight - m.vh) < 140 && staged) return;
      width = window.innerWidth;
      requestMeasure();
    });
    window.addEventListener('load', requestMeasure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(requestMeasure);
    if ('ResizeObserver' in window) new ResizeObserver(requestMeasure).observe($('.sheet') || document.body);
    if (chipQuery.addEventListener) chipQuery.addEventListener('change', function () { state.y = -1; update(); });

    safely(bootStage);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
