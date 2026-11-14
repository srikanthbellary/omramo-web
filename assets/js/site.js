/* Omramo site — progressive enhancement only. Everything is readable with this file missing.
   html.motion is set by the inline boot script when motion is allowed (no reduced-motion, no ?static=1).
   Scroll-driven scenes only ever write transforms, opacity and custom properties, never layout. */
(function () {
  'use strict';

  var root = document.documentElement;
  var isStatic = root.classList.contains('static');
  var motion = root.classList.contains('motion') && 'IntersectionObserver' in window;
  if (!motion) root.classList.remove('motion');

  function $(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }
  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }
  function clamp(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }
  function ease(t) {
    return t * t * (3 - 2 * t); // smoothstep
  }

  /* ---- Reveal on scroll ---- */
  if (motion) {
    var revealer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            revealer.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }
    );
    $$('.reveal, [data-map]').forEach(function (el) {
      revealer.observe(el);
    });
  }

  /* ---- Small-screen menu: a <details>, closed again by a choice, Escape or a tap outside ---- */
  $$('[data-menu]').forEach(function (menu) {
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) menu.open = false;
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.open) {
        menu.open = false;
        $('summary', menu).focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (menu.open && !menu.contains(e.target)) menu.open = false;
    });
  });

  /* ---- Header: mark the section being read ---- */
  if ('IntersectionObserver' in window) {
    var links = {};
    $$('[data-nav] a').forEach(function (a) {
      links[a.getAttribute('href').split('#')[1]] = a;
    });
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          var a = links[e.target.id];
          if (!a) return;
          if (e.isIntersecting) {
            Object.keys(links).forEach(function (k) {
              links[k].removeAttribute('aria-current');
            });
            a.setAttribute('aria-current', 'true');
          } else if (a.hasAttribute('aria-current')) {
            a.removeAttribute('aria-current');
          }
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    Object.keys(links).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) spy.observe(el);
    });
  }

  /* ---- Switchers: stacked articles become tabs ---- */
  if (!isStatic) {
    $$('[data-switch]').forEach(function (sw) {
      var tabs = $$('[role="tab"]', sw);
      var panels = $$('.switch__panel', sw);
      if (!tabs.length) return;
      panels.forEach(function (p) {
        p.setAttribute('role', 'tabpanel');
        p.setAttribute('aria-labelledby', p.getAttribute('data-tab'));
      });
      function select(i, focus) {
        tabs.forEach(function (t, j) {
          var on = i === j;
          t.setAttribute('aria-selected', on ? 'true' : 'false');
          t.tabIndex = on ? 0 : -1;
          panels[j].classList.toggle('is-active', on);
        });
        if (focus) tabs[i].focus();
      }
      tabs.forEach(function (t, i) {
        t.addEventListener('click', function () {
          select(i);
        });
        t.addEventListener('keydown', function (e) {
          var n = tabs.length;
          var to = { ArrowRight: (i + 1) % n, ArrowLeft: (i + n - 1) % n, Home: 0, End: n - 1 }[e.key];
          if (to === undefined) return;
          e.preventDefault();
          select(to, true);
        });
      });
    });
  }

  /* ---- Tap to see: the screenshot answers a real tap ---- */
  if (!isStatic) {
    $$('[data-demo]').forEach(function (demo) {
      var duo = $('[data-demo-duo]', demo);
      var word = $('[data-hot="word"]', demo);
      var back = $('[data-hot="back"]', demo);
      var status = $('[data-demo-status]', demo);
      var hint = $('[data-demo-hint]', demo);
      var steps = $$('[data-step]', demo);
      var title = $('h3', demo);
      if (!duo || !word || !back) return;

      function mark(now, done) {
        steps.forEach(function (li, i) {
          li.classList.toggle('is-now', now.indexOf(i + 1) > -1);
          li.classList.toggle('is-done', done.indexOf(i + 1) > -1);
        });
      }
      function set(open, focus, said) {
        demo.classList.toggle('is-open', open);
        duo.setAttribute('data-m', open ? 'r' : 'l');
        word.hidden = open;
        back.hidden = !open;
        $$('.demo__over img', demo).forEach(function (img) {
          // the closed layer is not there for assistive technology either
          if (open) img.closest('picture').removeAttribute('aria-hidden');
          else img.closest('picture').setAttribute('aria-hidden', 'true');
        });
        if (said !== undefined) status.textContent = said;
        if (focus) (open ? back : word).focus({ preventScroll: true });
      }
      // both states are fetched as the demo comes near, so the first tap answers at once
      if ('IntersectionObserver' in window) {
        var warm = new IntersectionObserver(
          function (entries) {
            if (!entries[0].isIntersecting) return;
            $$('img', demo).forEach(function (img) {
              img.loading = 'eager';
            });
            warm.disconnect();
          },
          { rootMargin: '60% 0px' }
        );
        warm.observe(demo);
      }
      demo.classList.add('is-live');
      if (hint) hint.hidden = false;
      if (title) title.textContent = 'Go on, tap the marked word.';
      set(false);
      mark([1], []);
      word.addEventListener('click', function () {
        set(true, true, 'The picture is open. “Back to my line” is the only way out.');
        mark([2, 3], [1]);
      });
      back.addEventListener('click', function () {
        set(false, true, 'You are back at your line. Tap the word again any time.');
        mark([], [1, 2, 3]);
      });
    });
  }

  /* ---- World map: link numbered pins and region cells ---- */
  $$('[data-map]').forEach(function (map) {
    var pinned = null;
    function show(id) {
      $$('[data-pin], [data-region]', map).forEach(function (el) {
        var mine = el.getAttribute('data-pin') || el.getAttribute('data-region');
        el.classList.toggle('is-on', id !== null && mine === id);
      });
    }
    $$('[data-pin], [data-region]', map).forEach(function (el) {
      var id = el.getAttribute('data-pin') || el.getAttribute('data-region');
      el.addEventListener('pointerenter', function () {
        show(id);
      });
      el.addEventListener('pointerleave', function () {
        show(pinned);
      });
      el.addEventListener('click', function () {
        pinned = pinned === id ? null : id;
        show(pinned);
      });
    });
  });

  /* ---- Sideways strips (landmarks; levels on small screens): keyboard reach, buttons, progress ---- */
  var pinQuery = window.matchMedia('(min-width: 960px) and (min-height: 740px)');
  function journeyPinned() {
    return motion && pinQuery.matches;
  }
  function scrollable(el) {
    // only a strip that really scrolls becomes a tab stop
    if (el.scrollWidth > el.clientWidth + 4 && getComputedStyle(el).overflowX !== 'visible') el.tabIndex = 0;
    else el.removeAttribute('tabindex');
  }
  var strips = $$('[data-rail], [data-tiers]');
  function syncStrips() {
    strips.forEach(scrollable);
  }
  window.addEventListener('resize', syncStrips);
  window.addEventListener('load', syncStrips);
  syncStrips();

  $$('[data-rail]').forEach(function (rail) {
    var journey = rail.closest('[data-journey]');
    var box = journey.querySelector('[data-rail-btns]');
    if (!box) return;
    box.hidden = false;
    var btns = $$('button', box);
    function step() {
      var card = rail.querySelector('li');
      return card ? card.getBoundingClientRect().width : 300;
    }
    function sync() {
      if (journeyPinned()) return;
      var max = rail.scrollWidth - rail.clientWidth - 2;
      btns[0].disabled = rail.scrollLeft <= 2;
      btns[1].disabled = rail.scrollLeft >= max;
      journey.style.setProperty('--jp', max > 0 ? clamp(rail.scrollLeft / max).toFixed(4) : '0');
    }
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var n = Math.max(1, Math.floor((rail.clientWidth * 0.7) / step()));
        rail.scrollBy({ left: Number(b.getAttribute('data-dir')) * n * step(), behavior: motion ? 'smooth' : 'auto' });
      });
    });
    rail.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    requestAnimationFrame(sync);
  });

  if (!motion) return;

  /* ---- Statement: words light up as the paragraph crosses the viewport ---- */
  var statements = $$('[data-words]').map(function (p) {
    var units = [];
    Array.prototype.slice.call(p.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        var frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(' '));
          } else {
            var s = document.createElement('span');
            s.className = 'w';
            s.textContent = part;
            units.push(s);
            frag.appendChild(s);
          }
        });
        p.replaceChild(frag, node);
      } else if (node.nodeType === 1) {
        node.classList.add('w');
        // a highlighted phrase counts for several beats so it lands last
        units.push(node, node, node);
      }
    });
    return { el: p, units: units };
  });

  /* ---- Hero: pinned while the device rises, opens flat and the notes arrive ---- */
  var hero = $('[data-hero]');
  var heroQuery = window.matchMedia('(min-width: 1180px) and (min-height: 700px)');
  var heroParts = hero && {
    track: $('.hero__track', hero),
    copy: $('.hero__copy', hero),
    device: $('.hero__device', hero),
    duo: $('[data-hero-duo]', hero),
    y1: 0,
    last: -1
  };
  function measureHero() {
    if (!hero || !heroQuery.matches) return;
    var vh = window.innerHeight;
    var h = heroParts.device.offsetHeight;
    // from where the device sits in the flow (peeking over the fold) to the middle of the screen
    heroParts.y1 = Math.min(0, Math.round((vh - h) / 2 + 30 - heroParts.device.offsetTop));
    hero.style.setProperty('--y1', heroParts.y1 + 'px');
    heroParts.last = -1;
  }
  function heroFrame(vh) {
    if (!hero || !heroQuery.matches) return;
    var span = heroParts.track.offsetHeight - vh;
    var p = span > 0 ? clamp(window.scrollY / span) : 1;
    if (p === heroParts.last) return;
    heroParts.last = p;
    var rise = ease(clamp(p / 0.56));
    var flat = ease(clamp((p - 0.06) / 0.5));
    hero.style.setProperty('--rise', rise.toFixed(4));
    hero.style.setProperty('--copy', (1 - clamp(p / 0.26)).toFixed(3));
    heroParts.duo.style.setProperty('--tilt', ((1 - flat) * 24).toFixed(2));
    heroParts.duo.style.setProperty('--fold', ((1 - flat) * 18).toFixed(2));
    hero.classList.toggle('is-past', p > 0.3);
    hero.classList.toggle('s1', p > 0.6);
    hero.classList.toggle('s2', p > 0.7);
    hero.classList.toggle('s3', p > 0.8);
  }

  /* ---- Levels: the device stays, the story on it changes with the copy beside it ---- */
  var tiers = $$('[data-tier]');
  var tiersQuery = window.matchMedia('(min-width: 960px) and (min-height: 640px)');
  var tierOn = -1;
  function tiersFrame(vh) {
    if (!tiers.length || !tiersQuery.matches) return;
    var best = 0;
    var dist = Infinity;
    tiers.forEach(function (t, i) {
      var r = t.firstElementChild.getBoundingClientRect();
      var d = Math.abs(r.top + r.height / 2 - vh / 2);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    if (best === tierOn) return;
    tierOn = best;
    tiers.forEach(function (t, i) {
      t.classList.toggle('is-active', i === best);
    });
  }

  /* ---- Landmarks: scrolling down travels the skyline sideways ---- */
  var journey = $('[data-journey]');
  var rail = journey && $('[data-rail]', journey);
  var travel = 0;
  function measureJourney() {
    if (!journey) return;
    if (!journeyPinned()) {
      journey.style.removeProperty('--travel');
      return;
    }
    travel = Math.max(0, rail.offsetWidth - root.clientWidth);
    journey.style.setProperty('--travel', travel + 'px');
  }
  function journeyFrame(vh) {
    if (!journey || !journeyPinned() || !travel) return;
    var r = journey.getBoundingClientRect();
    if (r.bottom < -100 || r.top > vh + 100) return;
    journey.style.setProperty('--jp', clamp(-r.top / (r.height - vh)).toFixed(4));
  }

  /* ---- Devices: unfold and settle as they scroll into view ---- */
  var devices = $$('[data-duo]').map(function (el) {
    return { el: el, p: -1, target: 0, seen: false, hero: el.hasAttribute('data-hero-duo') };
  });
  var watching = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        devices.forEach(function (d) {
          if (d.el === e.target) d.seen = e.isIntersecting;
        });
      });
      queue();
    },
    { rootMargin: '20% 0px 20% 0px' }
  );
  devices.forEach(function (d) {
    watching.observe(d.el);
  });

  function apply(d, p) {
    var e = ease(1 - p);
    d.el.style.setProperty('--tilt', (e * 13).toFixed(2));
    d.el.style.setProperty('--fold', (e * 12).toFixed(2));
    d.el.style.setProperty('--lift', (e * 30).toFixed(1));
  }

  var auroras = $$('.aurora');
  var lastDrift = '';
  var ticking = false;
  function queue() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(frame);
    }
  }
  function frame() {
    ticking = false;
    var vh = window.innerHeight;
    var again = false;
    var heroPinned = heroQuery.matches;

    // parallax is written on the backdrops themselves: a custom property on <html> would restyle the whole page
    var drift = Math.min(window.scrollY, 2400).toFixed(0);
    if (drift !== lastDrift) {
      lastDrift = drift;
      auroras.forEach(function (el) {
        el.style.setProperty('--scroll', drift);
      });
    }

    // read layout first, write styles after, so a frame never forces a second layout
    devices.forEach(function (d) {
      if (d.seen && !(d.hero && heroPinned)) {
        d.target = clamp((vh * 0.98 - d.el.getBoundingClientRect().top) / (vh * 0.62));
      }
    });
    var lit = statements.map(function (s) {
      var r = s.el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return -1;
      return Math.round(clamp((vh * 0.86 - r.top) / (vh * 0.5 + r.height * 0.6)) * s.units.length);
    });

    heroFrame(vh);
    tiersFrame(vh);
    journeyFrame(vh);

    devices.forEach(function (d) {
      if (!d.seen || (d.hero && heroPinned)) return;
      // first sighting: start from the folded pose without animating up to it
      if (d.p < 0) d.p = Math.max(0, d.target - 0.35) || 0.0001;
      var next = d.p + (d.target - d.p) * 0.14;
      if (Math.abs(d.target - next) < 0.002) next = d.target;
      else again = true;
      if (next !== d.p) {
        d.p = next;
        apply(d, next);
      }
    });

    statements.forEach(function (s, k) {
      var n = lit[k];
      if (n < 0) return;
      s.units.forEach(function (u, i) {
        u.classList.toggle('on', i < n);
      });
    });

    if (again) queue();
  }
  function measure() {
    measureHero();
    measureJourney();
    queue();
  }
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  measure();
})();
