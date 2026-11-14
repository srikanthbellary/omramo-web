/* Omramo site — progressive enhancement only. Everything is readable with this file missing.
   html.motion is set by the inline boot script when motion is allowed (no reduced-motion, no ?static=1). */
(function () {
  'use strict';

  var root = document.documentElement;
  var isStatic = root.classList.contains('static');
  var motion = root.classList.contains('motion') && 'IntersectionObserver' in window;
  if (!motion) root.classList.remove('motion');

  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }
  function clamp(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
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

  /* ---- World map: link numbered pins and region cards ---- */
  $$('[data-map]').forEach(function (map) {
    var scope = map.parentNode;
    var pinned = null;
    function set(id, on) {
      $$('[data-pin="' + id + '"], [data-region="' + id + '"]', scope).forEach(function (el) {
        el.classList.toggle('is-on', on);
      });
    }
    function show(id) {
      for (var i = 1; i <= 10; i++) set(i, String(i) === String(id));
    }
    $$('[data-pin], [data-region]', scope).forEach(function (el) {
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

  /* ---- Landmark rail: previous / next ---- */
  $$('[data-rail]').forEach(function (rail) {
    var box = rail.parentNode.querySelector('[data-rail-btns]');
    if (!box) return;
    box.hidden = false;
    var btns = $$('button', box);
    function step() {
      var card = rail.querySelector('li');
      return card ? card.getBoundingClientRect().width + 14 : 300;
    }
    function sync() {
      var max = rail.scrollWidth - rail.clientWidth - 2;
      btns[0].disabled = rail.scrollLeft <= 2;
      btns[1].disabled = rail.scrollLeft >= max;
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

  /* ---- Devices: unfold and settle as they scroll into view ---- */
  var devices = $$('[data-duo]').map(function (el) {
    return { el: el, p: -1, target: 0, seen: false };
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
    var k = 1 - p;
    var e = k * k * (3 - 2 * k); // smoothstep
    d.el.style.setProperty('--tilt', (e * 16).toFixed(2));
    d.el.style.setProperty('--fold', (e * 15).toFixed(2));
    d.el.style.setProperty('--lift', (e * 36).toFixed(1));
  }

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

    root.style.setProperty('--scroll', Math.min(window.scrollY, 2400).toFixed(0));

    // read layout first, write styles after, so a frame never forces a second layout
    devices.forEach(function (d) {
      if (d.seen) d.target = clamp((vh * 0.98 - d.el.getBoundingClientRect().top) / (vh * 0.62));
    });
    var lit = statements.map(function (s) {
      var r = s.el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return -1;
      return Math.round(clamp((vh * 0.86 - r.top) / (vh * 0.5 + r.height * 0.6)) * s.units.length);
    });

    devices.forEach(function (d) {
      if (!d.seen) return;
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
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  queue();
})();
