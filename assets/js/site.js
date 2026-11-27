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

  // What the page shows: news, apps, approved tools and links. It arrives from the
  // database once the person has signed in (see account.js), and start() fills the page.
  var content = {};
  var started = false;

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
    var data = content.news;
    var host = $('[data-news]');
    if (!host || !data || !data.stories) return;
    var thumbs = content.newsThumbs || {};

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
            '<span class="sr-only"> (opens ' + esc(s.source) + ' in a new window)</span></a></h3>' +
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
    var apps = content.apps;
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
          '<span class="sr-only">: ' + esc(a.name) + ', opens in a new window</span></a>' +
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
    placeAppTabs = function () { movePill(current(), true); };
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

  /* ---------- approved tools ---------- */

  // How each tool is used, as recorded in the AI Tool Register.
  var USES = {
    company: { label: 'Company', words: 'company licence license work' },
    personal: { label: 'Personal', words: 'personal own account' },
    both: { label: 'Both', words: 'both company personal licence license account' }
  };

  // Two letters for a tool with no icon: "Google AI Studio" gives GA, "WonderClip" gives WC.
  function initials(name) {
    var words = String(name).split(/[\s-]+/).filter(Boolean);
    if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
    var caps = String(name).replace(/[^A-Z]/g, '');
    return (caps.length > 1 ? caps.slice(0, 2) : String(name).slice(0, 2)).toUpperCase();
  }

  function byName(a, b) { return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }); }

  function renderTools() {
    var data = content.tools;
    var host = $('[data-tools]');
    var tabs = $('[data-tool-tabs]');
    if (!data || !data.tools || !data.groups || !host) return;
    var icons = content.toolIcons || {};

    // One heading and list per group, in the order "groups" gives, each sorted by name.
    var rows = [];
    var groups = data.groups.map(function (g) {
      var tools = data.tools.filter(function (t) { return t.group === g.id; }).sort(byName);
      return { id: g.id, name: g.name, tools: tools };
    }).filter(function (g) { return g.tools.length; });

    host.innerHTML = groups.map(function (g) {
      return '<section class="tool-group" data-group="' + esc(g.id) + '" aria-labelledby="tools-' + esc(g.id) + '">' +
        '<h3 class="tool-group-title" id="tools-' + esc(g.id) + '">' + esc(g.name) + '<span class="tool-group-count" data-group-count>' + g.tools.length + '</span></h3>' +
        '<ul class="tool-list">' + g.tools.map(function (t) {
          var use = USES[t.use] || USES.company;
          var icon = icons[t.id];
          var tile = icon && icon.src
            ? '<span class="tool-icon' + (icon.light ? ' is-light' : '') + '"><img src="' + esc(icon.src) + (icon.v ? '?v=' + esc(icon.v) : '') + '" width="128" height="128" alt="" loading="lazy" decoding="async"></span>'
            : '<span class="tool-icon is-initials" aria-hidden="true">' + esc(initials(t.name)) + '</span>';
          return '<li class="tool" data-id="' + esc(t.id) + '">' + tile +
            '<span class="tool-text"><span class="tool-name">' + esc(t.name) + '</span>' +
              '<span class="tool-for">' + esc(t.for) + (t.by ? ', from ' + esc(t.by) : '') + '</span></span>' +
            '<span class="use use-' + esc(t.use) + '"><span class="use-dots" aria-hidden="true"></span>' + use.label + '</span>' +
          '</li>';
        }).join('') + '</ul></section>';
    }).join('');

    function fold(text) {
      return String(text || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    }
    groups.forEach(function (g) {
      var section = $('[data-group="' + g.id + '"]', host);
      g.section = section;
      g.count = $('[data-group-count]', section);
      g.tools.forEach(function (t) {
        var use = USES[t.use] || USES.company;
        rows.push({
          row: $('[data-id="' + t.id + '"]', section),
          group: g,
          use: t.use,
          hay: fold([t.name, t.by, t.for, g.name, use.words].join(' ')) + ' ' + fold(t.name).replace(/ /g, '')
        });
      });
    });

    var checked = $('[data-tools-checked]');
    var day = new Date(data.checked + 'T12:00:00');
    if (checked && !isNaN(day)) checked.textContent = 'From the AI Tool Register, last checked on ' + day.toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' }) + '.';

    if (!tabs) return;
    // "Company" shows tools used on a company licence, "Personal" those used on
    // personal accounts. A tool used both ways shows under both.
    function fits(use, pick) { return pick === 'all' || use === pick || use === 'both'; }
    var pill = $('[data-tabs-pill]', tabs);
    [['all', 'All'], ['company', 'Company'], ['personal', 'Personal']].forEach(function (c) {
      var n = rows.filter(function (r) { return fits(r.use, c[0]); }).length;
      if (!n) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tab';
      b.setAttribute('aria-pressed', c[0] === 'all' ? 'true' : 'false');
      b.setAttribute('data-use', c[0]);
      b.innerHTML = esc(c[1]) + '<span class="tab-count">' + n + '</span>';
      tabs.appendChild(b);
    });

    function current() { return $('.tab[aria-pressed="true"]', tabs); }
    function movePill(btn, instant) {
      if (!pill || !btn) return;
      if (instant) pill.style.transition = 'none';
      pill.style.width = btn.offsetWidth + 'px';
      pill.style.height = btn.offsetHeight + 'px';
      pill.style.transform = 'translate(' + btn.offsetLeft + 'px,' + btn.offsetTop + 'px)';
      if (instant) { void pill.offsetWidth; pill.style.transition = ''; }
    }

    // Search: every word typed must appear somewhere in the tool's name, maker,
    // what it is for, its group, or how it is used. "chat gpt", "video" and "company" all work.
    var search = $('[data-tool-search]');
    var clear = $('[data-tool-clear]');
    var empty = $('[data-tools-empty]');
    var status = $('[data-tools-status]');

    function apply() {
      var pick = current() ? current().getAttribute('data-use') : 'all';
      var typed = search ? search.value.trim() : '';
      var words = fold(typed).split(' ').filter(Boolean);
      var counts = { all: 0, company: 0, personal: 0 };
      var shown = 0;
      groups.forEach(function (g) { g.shown = 0; });
      rows.forEach(function (r) {
        var found = words.every(function (w) { return r.hay.indexOf(w) !== -1; });
        if (found) {
          counts.all++;
          if (fits(r.use, 'company')) counts.company++;
          if (fits(r.use, 'personal')) counts.personal++;
        }
        var on = found && fits(r.use, pick);
        r.row.classList.toggle('is-hidden', !on);
        if (on) { shown++; r.group.shown++; }
      });
      groups.forEach(function (g) {
        g.section.hidden = !g.shown;
        if (g.count) g.count.textContent = g.shown;
      });
      $$('.tab', tabs).forEach(function (t) {
        var count = $('.tab-count', t);
        if (count) count.textContent = counts[t.getAttribute('data-use')];
      });
      if (clear) clear.hidden = !typed;
      if (empty) {
        empty.hidden = shown > 0;
        if (!shown) {
          empty.textContent = !typed ? 'No tools here.'
            : pick !== 'all' && counts.all ? 'No ' + pick + ' tool matches “' + typed + '”, but ' + (counts.all === 1 ? 'one tool does' : counts.all + ' tools do') + ' under All.'
            : 'No approved tool matches “' + typed + '”. Check the spelling, or declare the tool if you need it.';
        }
      }
      if (status) status.textContent = shown === rows.length ? '' : shown + ' of ' + rows.length + ' tools shown';
      movePill(current());
      requestMeasure();
    }

    tabs.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.tab') : null;
      if (!b || b.getAttribute('aria-pressed') === 'true') return;
      $$('.tab', tabs).forEach(function (t) { t.setAttribute('aria-pressed', t === b ? 'true' : 'false'); });
      apply();
    });
    if (search) {
      search.addEventListener('input', apply);
      search.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && search.value) { e.preventDefault(); search.value = ''; apply(); }
      });
      // "/" jumps to the search box while this page is showing.
      document.addEventListener('keydown', function (e) {
        if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || root.getAttribute('data-view') !== 'tools') return;
        var t = e.target;
        if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
        e.preventDefault();
        search.focus();
      });
    }
    if (clear) clear.addEventListener('click', function () { search.value = ''; apply(); search.focus(); });
    if (search && search.value) apply();           // the browser kept what was typed before a reload
    placeToolTabs = function () { movePill(current(), true); };
    window.addEventListener('resize', placeToolTabs);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeToolTabs);
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

  /* ---------- the four pages ---------- */

  /*
    The site is four pages in one file: AI news, Apps, How it works (the four
    steps on the 3D stage) and Approved tools. Only one shows at a time. The
    address ends in #news, #apps, #how or #tools, so each page can be linked to
    and the Back button works.

    The steps are the front page the first time someone opens the site. From
    then on it opens on the news (the script in index.html decides, before the
    first paint) and the steps are the third tab.
  */

  var HOW_LINKS = /^(how|process|top|next|step-[1-4])$/;   // addresses that belong to "How it works"
  var view = root.getAttribute('data-view') || 'how';
  var home = root.getAttribute('data-home') || 'news';    // the page shown when the address names none
  var keptScroll = {};                                     // how far down each page was left
  var placeAppTabs = null;                                 // set by renderApps
  var placeToolTabs = null;                                // set by renderTools

  var extraViews = {};                                     // pages added after sign-in: People, for admins

  function viewOf(hash) {
    if (hash === 'news' || hash === 'apps' || hash === 'tools' || extraViews[hash]) return hash;
    return HOW_LINKS.test(hash) ? 'how' : '';
  }

  // account.js adds the People page for admins. Its address is #people.
  window.SD_ADD_VIEW = function (name, onEnter) {
    extraViews[name] = onEnter || function () {};
    if (started && location.hash.slice(1) === name) route();
  };

  // What has to happen whenever a page comes on screen, including the first one.
  function enter(name) {
    els.nav.forEach(function (link) {
      var on = link.getAttribute('data-nav') === name;
      link.classList.toggle('is-active', on);
      if (on) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    if (name === 'how') {
      // The steps have now been the front page once.
      try { window.localStorage.setItem('sd-intro-seen', '1'); } catch (e) { /* private browsing: they will simply show again */ }
      bootStage();
    }
    if (name === 'apps' && placeAppTabs) placeAppTabs();
    if (name === 'tools' && placeToolTabs) placeToolTabs();
    if (extraViews[name]) extraViews[name]();
  }

  function show(name, anchor) {
    if (name === view) return;
    keptScroll[view] = window.pageYOffset;
    view = name;
    root.setAttribute('data-view', name);
    state.cue = -1;
    state.chipOn = state.hasCta = null;
    enter(name);
    measure();
    var to = keptScroll[name] || 0;
    if (anchor === 'top') to = 0;
    else if (anchor === 'next') to = m.finale;
    else if (anchor) to = (scenes[+anchor.slice(5)] || { focus: 0 }).focus;
    window.scrollTo({ top: to, behavior: 'instant' });
    state.y = -1;
    update();
  }

  function route() {
    if (!started) return;                    // still behind the sign-in screen
    var hash = location.hash.slice(1);
    var name = hash ? viewOf(hash) : home;
    if (!name) return;                       // an ordinary link to somewhere on the page
    var anchor = name === 'how' && hash !== 'how' && hash !== 'process' ? hash : '';
    if (name !== view) show(name, anchor);
    else if (!anchor) window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
  }

  /* ---------- scrolling: one place that works out where you are ---------- */

  /*
    update() runs on every scroll frame, so it only does sums. Everything it
    needs to know about the layout is measured once, in measure(), and it
    changes the style of one small element at a time. Reading the layout here,
    or setting a variable on the whole page, would make the browser work out
    the entire page again on every frame.
  */

  var CUE_NAMES = ['Start', 'Step 1 of 4', 'Step 2 of 4', 'Step 3 of 4', 'Step 4 of 4', 'What’s next'];
  var stage = null;
  var staged = false;      // true once the 3D stage is drawing
  var scenes = [];
  var tickers = [];
  var m = { vh: 1, max: 1, finale: 0, cta: 0 };
  var state = { p: 0, cue: -1, y: -1, drift: 0, last: 0, chipOn: null, stuck: null, hasCta: null };
  var els = {};
  var measureQueued = false;
  var chipQuery = window.matchMedia ? window.matchMedia('(max-width: 1000px)') : { matches: true };
  var barQuery = window.matchMedia ? window.matchMedia('(max-width: 860px)') : { matches: false };   // the tab bar along the bottom is showing

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
    if (view === 'how') {
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
      var finale = $('[data-finale]');
      m.finale = finale ? docTop(finale) : m.max + m.vh;
      var cta = $('[data-cta]');
      m.cta = cta ? docTop(cta) + cta.offsetHeight : 0;
    }
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
    var stuck = y > 14;
    if (stuck !== state.stuck) { state.stuck = stuck; if (els.top) els.top.classList.toggle('is-stuck', stuck); }

    // On the news and the apps, the small "Declare a tool" button is always in the top bar.
    // On "How it works" it appears once the big one has scrolled away.
    var hasCta = view !== 'how' || y > m.cta - 70;
    if (hasCta !== state.hasCta) { state.hasCta = hasCta; if (els.top) els.top.classList.toggle('has-cta', hasCta); }
    if (view !== 'how') return;

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

    // The rail on the right and the chip on small screens: the opening screen, the four steps, then "What's next".
    var last = scenes.length ? scenes[scenes.length - 1].focus : 0;
    var nextAt = Math.max(last + 1, m.finale - m.vh * 0.5);
    var where = y >= nextAt ? 5 : y > last ? 4 + (y - last) / (nextAt - last) : p;
    var cue = y >= nextAt ? 5 : Math.round(p);
    if (els.fill) els.fill.style.transform = 'scaleY(' + (where / 5).toFixed(4) + ')';
    if (cue !== state.cue) {
      state.cue = cue;
      els.cues.forEach(function (c, n) {
        c.classList.toggle('is-active', n === cue);
        c.classList.toggle('is-done', n < cue);
        if (n === cue) c.setAttribute('aria-current', 'true'); else c.removeAttribute('aria-current');
      });
      if (els.rail) els.rail.classList.toggle('is-quiet', cue >= 5);
      if (els.chipText) els.chipText.textContent = CUE_NAMES[cue];
    }
    var chipOn = y > 60 && cue < 5;
    if (chipOn !== state.chipOn) { state.chipOn = chipOn; if (els.chip) els.chip.classList.toggle('is-on', chipOn); }
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

  // Where the set sits in the picture. On phones it sits a little higher and smaller, to leave room for the tab bar.
  function frameStage() {
    if (!stage) return;
    stage.setFraming(!tallQuery.matches ? { right: 0.225, up: -0.02, fillHeight: 0.66, fillWidth: 0.5 }
      : barQuery.matches ? { right: 0, up: 0.245, fillHeight: 0.4, fillWidth: 0.96 }
      : { right: 0, up: 0.2, fillHeight: 0.42, fillWidth: 0.96 });
  }

  // Swaps the 3D stage for still pictures. With keepPlace, the reader stays at the step they were on.
  function goStill(keepPlace) {
    var here = keepPlace && staged && view === 'how' && window.pageYOffset < m.finale - m.vh ? Math.round(state.p) : 0;
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
    function sync() { if (stage) stage.run(onStage && view === 'how' && !document.hidden); }

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
      // The stage only draws while the steps are on screen: not behind the news or the apps, and not in a hidden tab.
      if ('IntersectionObserver' in window && act) {
        new IntersectionObserver(function (entries) { onStage = entries[0].isIntersecting; sync(); }, { rootMargin: '10% 0px 10% 0px' }).observe(act);
      }
      document.addEventListener('visibilitychange', sync);
      // If the graphics context is lost and does not come back, fall back to the still pictures.
      var lostTimer = 0;
      canvas.addEventListener('webglcontextlost', function () { lostTimer = setTimeout(goStill, 4000); });
      canvas.addEventListener('webglcontextrestored', function () { clearTimeout(lostTimer); });
      if (tallQuery.addEventListener) tallQuery.addEventListener('change', function () { frameStage(); requestMeasure(); });
      if (barQuery.addEventListener) barQuery.addEventListener('change', frameStage);
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

  // Called the first time "How it works" is shown: straight away on a first visit,
  // otherwise only when someone opens that tab. Until then none of the 3D code is fetched.
  var booted = false;
  function bootStage() {
    if (booted) return;
    booted = true;
    if (!window.SD_CAN_STAGE || !window.SD_CAN_STAGE()) { goStill(); return; }
    root.classList.add('stage-pending');
    var settled = false;
    function load() {
      if (settled) return;
      settled = true;
      window.SD_LOAD_STAGE().then(startStage, function (err) {
        if (window.console) console.warn('The 3D stage could not load, showing still pictures instead.', err);
        goStill();
      });
    }
    if (window.SD_LOAD_STAGE) load();
    else {
      // stage-boot.js has not run yet, or this browser is too old to run it.
      document.addEventListener('sd-stage-loader', load);
      setTimeout(function () { if (!settled) { settled = true; goStill(); } }, 15000);
    }
  }

  /* ---------- installing the dashboard as an app ---------- */

  // Chrome and Edge, on computers and on Android, offer to install the site as an app.
  // The "Install app" buttons only show while that offer stands.
  function setupInstall() {
    var installed = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
    if (installed) { root.classList.add('is-app'); return; }
    // The offer itself is caught by the script at the top of index.html, as window.SD_INSTALL.
    function done() {
      window.SD_INSTALL = null;
      root.classList.remove('can-install');
    }
    window.addEventListener('appinstalled', done);
    $$('[data-install]').forEach(function (button) {
      button.addEventListener('click', function () {
        var offer = window.SD_INSTALL;
        if (!offer) return;
        offer.prompt();
        offer.userChoice.then(done, done);
      });
    });
    // Safari on iPhone and iPad has no install offer, so the footer says how to add it to the home screen.
    var apple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (apple) root.classList.add('ios-install');
  }

  // The service worker (sw.js) makes the site installable and lets it open without a connection.
  // It is not used inside a preview frame, or anywhere that is not https.
  function registerWorker() {
    if (!('serviceWorker' in navigator) || window.top !== window) return;
    var local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (location.protocol !== 'https:' && !local) return;
    function go() { navigator.serviceWorker.register('sw.js').catch(function () { /* the site works without it */ }); }
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
  }

  /* ---------- apps, stories and the form open in a window of their own ---------- */

  // A click on any link that leaves the dashboard opens it in its own window, so the dashboard
  // stays just as it was. A plain "new tab" link is not enough: the browser panel in the Claude
  // app opens those in place of the dashboard. Ctrl, Shift or middle clicks are left to the browser.
  function windowFeatures() {
    var w = Math.round(Math.min(1280, (screen.availWidth || 1280) - 48));
    var h = Math.round(Math.min(900, (screen.availHeight || 900) - 48));
    var left = Math.round(Math.max(0, (window.screenX || 0) + ((window.outerWidth || w) - w) / 2));
    var top = Math.round(Math.max(0, (window.screenY || 0) + ((window.outerHeight || h) - h) / 2));
    return 'popup,width=' + w + ',height=' + h + ',left=' + left + ',top=' + top;
  }

  function setupWindows() {
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var link = e.target.closest ? e.target.closest('a[target="_blank"]') : null;
      if (!link || !/^https:\/\//.test(link.href)) return;
      var win = window.open(link.href, '_blank', windowFeatures());
      if (!win) return; // pop-ups blocked: the link opens a new tab as usual
      try { win.opener = null; } catch (err) { /* already on the other site */ }
      e.preventDefault();
    });
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

    safely(setupInstall);
    safely(registerWorker);
    safely(setupWindows);

    // The rest waits until the person has signed in and the content has arrived.
    if (window.SD_DATA) start(window.SD_DATA);
    else document.addEventListener('sd-data', function () { start(window.SD_DATA); });
  }

  // Fills in the links that are not written into index.html, such as the declaration form.
  function fillLinks(links) {
    $$('[data-link]').forEach(function (link) {
      var href = links && links[link.getAttribute('data-link')];
      if (typeof href === 'string' && /^https:\/\//.test(href)) link.href = href;
    });
  }

  function start(data) {
    if (started || !data) return;
    started = true;
    content = data;

    safely(function () { fillLinks(data.links); });
    safely(renderNews);
    safely(renderApps);
    safely(renderTools);
    safely(setupReveal);
    safely(function () { enter(view); });
    safely(measure);
    safely(watchTickers);

    window.addEventListener('hashchange', route);
    els.nav.forEach(function (link) {
      link.addEventListener('click', function (e) {
        // A second click on the tab you are already on goes back to the top of that page.
        if (link.getAttribute('href') !== location.hash) return;
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
      });
    });
    var toTop = $('[data-to-top]');
    if (toTop) toTop.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
    });

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
    if ('ResizeObserver' in window) new ResizeObserver(requestMeasure).observe($('main') || document.body);
    if (chipQuery.addEventListener) chipQuery.addEventListener('change', function () { state.y = -1; update(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
