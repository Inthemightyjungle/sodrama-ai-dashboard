/* So Drama! Entertainment: AI Solutions Dashboard */
(function () {
  'use strict';

  var root = document.documentElement;
  var mq = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
  var reduce = mq('(prefers-reduced-motion: reduce)');
  var finePointer = mq('(hover: hover) and (pointer: fine)');
  var anim = !reduce && 'IntersectionObserver' in window;
  if (anim) root.classList.add('anim');

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7"></path><path d="M8 7h9v9"></path></svg>';
  var WARN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3L2 21h20L12 3z"></path><path d="M12 10v5"></path><path d="M12 18h.01"></path></svg>';

  /* ---------- News ---------- */
  function renderNews() {
    var data = window.SD_NEWS;
    var host = $('[data-news]');
    if (!data || !host) return;
    var stories = data.stories || [];
    var label = $('[data-news-week]');
    if (label) label.textContent = data.label || '';
    var cautions = stories.filter(function (s) { return s.kind === 'caution'; }).length;
    var updates = stories.length - cautions;
    var legend = $('[data-news-legend]');
    if (legend) {
      legend.innerHTML = '<span><i></i>' + updates + (updates === 1 ? ' update' : ' updates') + '</span>' +
        (cautions ? '<span><i class="c"></i>' + cautions + (cautions === 1 ? ' word' : ' words') + ' of caution</span>' : '');
    }

    function card(s, i, lead) {
      var caution = s.kind === 'caution';
      var tag = caution
        ? '<span class="tag tag--caution">' + WARN + 'Word of caution</span>'
        : '<span class="tag">' + esc(s.category) + '</span>';
      var meta = (caution ? esc(s.category) + ' · ' : '') + esc(s.date) + ' · ' + esc(s.source);
      return '<article class="story' + (lead ? ' story--lead' : '') + (caution ? ' story--caution' : '') + '" data-reveal style="--rd:' + (i * 0.08).toFixed(2) + 's">' +
        '<a class="story-link" href="' + esc(s.url) + '" target="_blank" rel="noopener">' +
          '<div class="thumb">' +
            (s.image ? '<img src="' + esc(s.image) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : '') +
            '<span class="thumb-fallback" aria-hidden="true">' + esc(s.source) + '</span>' +
            (lead && s.imageCredit ? '<span class="thumb-credit">' + esc(s.imageCredit) + '</span>' : '') +
            '<span class="thumb-wipe" aria-hidden="true"></span>' +
          '</div>' +
          '<div class="story-body">' +
            '<p class="story-kicker">' + tag + '<span>' + meta + '</span></p>' +
            '<h3 class="story-title"><span>' + esc(s.title) + '</span></h3>' +
            '<p class="story-dek">' + esc(s.summary) + '</p>' +
            (lead ? '<span class="story-cta">Read on ' + esc(s.source) + ARROW + '</span>' : '') +
          '</div>' +
          (lead ? '' : '<span class="story-arrow" aria-hidden="true">' + ARROW + '</span>') +
          '<span class="sr-only"> (opens ' + esc(s.source) + ' in a new tab)</span>' +
        '</a>' +
      '</article>';
    }

    var html = stories.length ? card(stories[0], 0, true) : '';
    if (stories.length > 1) {
      html += '<div class="news-list">' + stories.slice(1).map(function (s, i) { return card(s, i + 1, false); }).join('') + '</div>';
    }
    host.innerHTML = html;

    $$('.thumb', host).forEach(function (t) {
      var img = $('img', t);
      if (!img) { t.classList.add('is-broken'); return; }
      img.addEventListener('error', function () { t.classList.add('is-broken'); });
    });
  }

  /* ---------- Apps ---------- */
  function dcRow(checked, width, light) {
    return '<div class="dc-row"><span class="dc-box' + (checked ? '' : ' empty') + '">' +
      (checked ? '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>' : '') +
      '</span><span class="dc-bar' + (light ? ' light' : '') + '" style="width:' + width + 'cqw"></span></div>';
  }
  var DECLARE_COVER =
    '<div class="dc">' +
      '<div class="dc-beam"></div><div class="dc-floor"></div>' +
      '<svg class="dc-lamp" viewBox="0 0 120 90"><rect x="54" y="0" width="12" height="20" fill="#3A3A3A"></rect>' +
        '<path d="M28 18 H92 L83 62 H37 Z" fill="#F4F1EA" stroke="#0B0B0B" stroke-width="4" stroke-linejoin="round"></path>' +
        '<line x1="44" y1="30" x2="76" y2="30" stroke="#0B0B0B" stroke-width="3" stroke-linecap="round"></line>' +
        '<line x1="46" y1="41" x2="74" y2="41" stroke="#0B0B0B" stroke-width="3" stroke-linecap="round"></line>' +
        '<rect x="34" y="60" width="52" height="10" rx="2" fill="#0B0B0B"></rect><rect x="39" y="62" width="42" height="6" rx="1" fill="#FFE68A"></rect></svg>' +
      '<div class="dc-words"><span class="dc-big">Declare</span><span class="dc-serif">your AI tools.</span></div>' +
      '<div class="dc-card"><div class="dc-card-head">AI tool declaration</div>' +
        '<div class="dc-rows">' + dcRow(true, 15) + dcRow(true, 11) + dcRow(false, 13, true) + '</div>' +
        '<div class="dc-submit">Submit</div></div>' +
      '<div class="dc-sticker">AI</div>' +
    '</div>';

  function coverHTML(c) {
    if (!c) return '';
    if (c.type === 'declare') return DECLARE_COVER;
    if (c.type === 'layers') {
      return '<img class="cover-img cover-zoom" src="' + esc(c.background) + '" alt="" loading="lazy">' +
        '<img class="cl-logo' + (c.pixelated ? ' pixel' : '') + '" src="' + esc(c.logo) + '" alt="" loading="lazy">';
    }
    if (c.type === 'image') {
      return '<img class="cover-img cover-zoom' + (c.pixelated ? ' pixel' : '') + '" src="' + esc(c.src) + '" alt="" loading="lazy" style="object-position:' + esc(c.position || 'center') + '">';
    }
    return '';
  }

  function renderApps() {
    var apps = window.SD_APPS;
    var grid = $('[data-apps]');
    var tabs = $('[data-tabs]');
    if (!apps || !grid) return;

    grid.innerHTML = apps.map(function (a, i) {
      return '<article class="app" data-cat="' + esc(a.category) + '" data-reveal style="--rd:' + (i * 0.09).toFixed(2) + 's">' +
        '<div class="app-cover" aria-hidden="true">' + coverHTML(a.cover) + '<span class="app-glare"></span></div>' +
        '<div class="app-body">' +
          '<p class="app-kicker">' + esc(a.category) + ' · ' + esc(a.meta) + '</p>' +
          '<h3 class="app-name">' + esc(a.name) + '</h3>' +
          (a.description ? '<p class="app-desc">' + esc(a.description) + '</p>' : '') +
        '</div>' +
        '<a class="app-action" href="' + esc(a.url) + '" target="_blank" rel="noopener">' + esc(a.action) + ARROW +
          '<span class="sr-only">: ' + esc(a.name) + ', opens in a new tab</span></a>' +
      '</article>';
    }).join('');

    if (!tabs) return;
    var pill = $('[data-tabs-pill]', tabs);
    var cats = ['All'];
    apps.forEach(function (a) { if (cats.indexOf(a.category) < 0) cats.push(a.category); });
    cats.forEach(function (c) {
      var n = c === 'All' ? apps.length : apps.filter(function (a) { return a.category === c; }).length;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tab';
      b.setAttribute('aria-pressed', c === 'All' ? 'true' : 'false');
      b.setAttribute('data-cat', c);
      b.innerHTML = esc(c) + '<span class="tab-count">' + n + '</span>';
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
      var first = cards.map(function (c) { return c.getBoundingClientRect(); });
      var wasHidden = cards.map(function (c) { return c.classList.contains('is-hidden'); });
      cards.forEach(function (c) { c.classList.toggle('is-hidden', !(cat === 'All' || c.getAttribute('data-cat') === cat)); });
      if (!anim || !cards.length || !cards[0].animate) return;
      cards.forEach(function (c, i) {
        if (c.classList.contains('is-hidden')) return;
        c.classList.add('is-in');
        if (wasHidden[i]) {
          c.animate([{ opacity: 0, transform: 'translateY(26px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 600, easing: 'cubic-bezier(.16,1,.3,1)' });
          return;
        }
        var l = c.getBoundingClientRect();
        var dx = first[i].left - l.left, dy = first[i].top - l.top;
        if (dx || dy) c.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)' });
      });
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

    // 3D tilt + glare on covers
    if (anim && finePointer) {
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

  /* ---------- Titles split into words ---------- */
  function splitWords(el) {
    var n = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var outer = document.createElement('span');
            outer.className = 'sw';
            var inner = document.createElement('span');
            inner.textContent = part;
            inner.style.setProperty('--wi', n++);
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1) {
          walk(ch);
        }
      });
    })(el);
  }

  /* ---------- Reveal on scroll ---------- */
  function setupReveal() {
    var els = $$('[data-reveal], [data-split]');
    if (!anim) { els.forEach(function (e) { e.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- Spotlight dust in the beam ---------- */
  function makeDust(canvas, isHot) {
    var ctx = canvas.getContext('2d');
    var parts = [], w = 0, h = 0, running = false, raf = 0, speed = 1;
    function spawn(anywhere) {
      return {
        x: anywhere ? Math.random() * w : -4,
        y: Math.random() * h,
        r: 0.6 + Math.random() * 1.9,
        vx: 0.12 + Math.random() * 0.45,
        vy: (Math.random() - 0.5) * 0.25,
        a: 0.3 + Math.random() * 0.6,
        t: Math.random() * 6.283,
        tw: 0.015 + Math.random() * 0.035
      };
    }
    function resize() {
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.offsetWidth; h = canvas.offsetHeight;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.round(clamp(w * h / 1300, 14, 120));
      parts = [];
      for (var i = 0; i < count; i++) parts.push(spawn(true));
    }
    function frame() {
      raf = 0;
      if (!running) return;
      speed += ((isHot() ? 3.2 : 1) - speed) * 0.06;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#FFFFFF';
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += p.vx * speed; p.y += p.vy * speed; p.t += p.tw * speed;
        if (p.x > w + 4) { parts[i] = spawn(false); continue; }
        if (p.y < -4) p.y = h + 4; else if (p.y > h + 4) p.y = -4;
        ctx.globalAlpha = p.a * (0.5 + 0.5 * Math.sin(p.t)) * (0.3 + 0.7 * (p.x / w));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize', resize);
    return {
      toggle: function (on) {
        running = on;
        if (on && !raf) raf = requestAnimationFrame(frame);
      }
    };
  }

  /* ---------- Hero ---------- */
  function setupHero() {
    var hero = $('[data-hero]');
    if (!hero) return null;
    var cta = $('[data-cta]', hero);
    var magnet = $('[data-magnet]', hero);
    var canvas = $('[data-dust]', hero);
    var hot = false;
    var mx = 0.74, my = 0.28, tx = mx, ty = my, looping = false;

    function loop() {
      mx += (tx - mx) * 0.09; my += (ty - my) * 0.09;
      hero.style.setProperty('--mx', (mx * 100).toFixed(2) + '%');
      hero.style.setProperty('--my', (my * 100).toFixed(2) + '%');
      if (Math.abs(tx - mx) > 0.0005 || Math.abs(ty - my) > 0.0005) requestAnimationFrame(loop);
      else looping = false;
    }
    if (anim && finePointer) {
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width;
        ty = (e.clientY - r.top) / r.height;
        if (!looping) { looping = true; requestAnimationFrame(loop); }
      });
    }
    if (anim && finePointer && cta && magnet) {
      cta.addEventListener('pointermove', function (e) {
        var r = magnet.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        magnet.style.transform = 'translate(' + clamp(dx * 0.16, -18, 18).toFixed(1) + 'px,' + clamp(dy * 0.16, -14, 14).toFixed(1) + 'px)';
      });
      cta.addEventListener('pointerenter', function () { hot = true; });
      cta.addEventListener('pointerleave', function () { hot = false; magnet.style.transform = ''; });
    }
    if (cta) {
      cta.addEventListener('focus', function () { hot = true; });
      cta.addEventListener('blur', function () { hot = false; });
    }
    var dust = (anim && canvas && canvas.getContext) ? makeDust(canvas, function () { return hot; }) : null;
    if (dust) {
      new IntersectionObserver(function (en) { dust.toggle(en[0].isIntersecting); }).observe(hero);
    }
    return {
      onScroll: function () {
        if (!anim) return;
        var r = hero.getBoundingClientRect();
        if (r.bottom < 0) return;
        hero.style.setProperty('--hp', clamp(-r.top / (r.height || 1), 0, 1).toFixed(3));
      }
    };
  }

  /* ---------- Process: pinned on wide screens, stacked elsewhere ---------- */
  function setupProcess() {
    var proc = $('[data-process]');
    if (!proc) return null;
    var track = $('[data-process-track]', proc);
    var steps = $$('[data-step]', proc);
    var nodes = $$('[data-goto]', proc);
    var counter = $('[data-counter]', proc);
    var current = -1, pinned = false, stackIO = null, timers = [];

    function setActive(i) {
      if (i === current) return;
      if (current >= 0 && steps[current]) {
        var prev = steps[current], pi = current;
        prev.classList.remove('is-active');
        prev.classList.add('is-leaving');
        clearTimeout(timers[pi]);
        timers[pi] = setTimeout(function () { prev.classList.remove('is-leaving'); }, 650);
      }
      current = i;
      if (i >= 0) {
        clearTimeout(timers[i]);
        steps[i].classList.remove('is-leaving');
        steps[i].classList.add('is-active');
      }
      if (counter) counter.style.setProperty('--step', Math.max(0, i));
      nodes.forEach(function (n, k) {
        n.classList.toggle('is-done', k < i);
        n.classList.toggle('is-current', k === i);
        if (k === i) n.setAttribute('aria-current', 'step'); else n.removeAttribute('aria-current');
      });
    }

    function setupStack() {
      if (!anim) { steps.forEach(function (s) { s.classList.add('is-active'); }); return; }
      stackIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('is-active'); stackIO.unobserve(en.target); }
        });
      }, { threshold: 0.3 });
      steps.forEach(function (s) { if (!s.classList.contains('is-active')) stackIO.observe(s); });
    }

    function layout() {
      var want = anim && window.innerWidth >= 960 && window.innerHeight >= 640;
      if (want !== pinned) {
        pinned = want;
        proc.classList.toggle('is-pinned', pinned);
        if (pinned) {
          if (stackIO) { stackIO.disconnect(); stackIO = null; }
          steps.forEach(function (s) { s.classList.remove('is-active', 'is-leaving'); });
          current = -1;
        } else {
          track.style.height = '';
          steps.forEach(function (s) { s.classList.remove('is-leaving'); });
          setupStack();
        }
      }
      if (pinned) track.style.height = Math.round(window.innerHeight * (1 + steps.length * 0.85)) + 'px';
    }

    function onScroll() {
      if (!pinned) return;
      var vh = window.innerHeight;
      var r = track.getBoundingClientRect();
      var total = track.offsetHeight - vh;
      var p = clamp(-r.top / (total || 1), 0, 1);
      proc.style.setProperty('--p', p.toFixed(4));
      if (r.top > vh * 0.5 || r.bottom < vh * 0.5) { setActive(-1); return; }
      setActive(Math.min(steps.length - 1, Math.floor(p * steps.length)));
    }

    nodes.forEach(function (n) {
      n.addEventListener('click', function () {
        var k = parseInt(n.getAttribute('data-goto'), 10) || 0;
        var top = window.pageYOffset + track.getBoundingClientRect().top;
        var total = track.offsetHeight - window.innerHeight;
        window.scrollTo({ top: top + total * ((k + 0.15) / steps.length), behavior: reduce ? 'auto' : 'smooth' });
      });
    });

    layout();
    if (!pinned) setupStack();
    return { layout: layout, onScroll: onScroll };
  }

  /* ---------- Header: progress, hide on scroll, active section ---------- */
  function setupChrome() {
    var header = $('[data-header]');
    var bar = $('[data-progress]');
    var lastY = window.pageYOffset;
    var links = $$('[data-nav]');
    if ('IntersectionObserver' in window && links.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var id = en.target.id;
          links.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('data-nav') === id); });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      links.forEach(function (l) { var s = document.getElementById(l.getAttribute('data-nav')); if (s) io.observe(s); });
      var top = document.getElementById('top');
      if (top) io.observe(top);
    }
    if (header) header.addEventListener('focusin', function () { header.classList.remove('is-hidden'); });
    return {
      onScroll: function () {
        var y = window.pageYOffset;
        var max = document.documentElement.scrollHeight - window.innerHeight;
        if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1) : 0).toFixed(4) + ')';
        if (header) {
          if (y > lastY + 4 && y > 160) header.classList.add('is-hidden');
          else if (y < lastY - 4 || y <= 160) header.classList.remove('is-hidden');
        }
        lastY = y;
      }
    };
  }

  /* ---------- Boot ---------- */
  function safely(fn) {
    try { return fn(); } catch (err) { if (window.console) console.error(err); return null; }
  }

  function init() {
    safely(renderNews);
    safely(renderApps);
    safely(function () { $$('[data-split]').forEach(splitWords); });
    var revealed = safely(function () { setupReveal(); return true; });
    if (!revealed) root.classList.remove('anim');

    var parts = [safely(setupChrome), safely(setupHero), safely(setupProcess)].filter(Boolean);
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        parts.forEach(function (p) { if (p.onScroll) safely(p.onScroll); });
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () {
      parts.forEach(function (p) { if (p.layout) safely(p.layout); });
      onScroll();
    });
    onScroll();

    var started = false;
    function ready() { if (started) return; started = true; root.classList.add('is-ready'); }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(ready);
      setTimeout(ready, 700);
    } else {
      ready();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
