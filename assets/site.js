/* Omramo site behaviour. No dependencies. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------- theme */
  function currentTheme() {
    var set = root.getAttribute("data-theme");
    if (set === "dark" || set === "light") return set;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function labelTheme(btn) {
    var next = currentTheme() === "dark" ? "Turn the lamp on" : "Turn the lamp off";
    btn.setAttribute("aria-label", next);
    btn.setAttribute("title", next);
  }
  var themeBtn = document.querySelector("[data-theme-toggle]");
  if (themeBtn) {
    labelTheme(themeBtn);
    themeBtn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("omramo-theme", next); } catch (e) { /* private mode */ }
      labelTheme(themeBtn);
    });
  }

  /* ---------------------------------------------------------- nav */
  var nav = document.querySelector(".nav");
  if (nav) {
    var onScroll = function () { nav.classList.toggle("scrolled", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------------------------------------------------------- the fold */
  var fold = document.querySelector(".fold[data-state]");
  var hero = document.querySelector(".hero");
  if (fold) {
    var hint = document.getElementById("fold-hint");
    var userTouched = false;
    var introDone = false;
    var setState = function (state) {
      fold.setAttribute("data-state", state);
      fold.setAttribute("aria-pressed", state === "closed" ? "true" : "false");
      if (hint) hint.textContent = state === "closed" ? "Closed, it reads Omramo. Tap to open the book." : "Open, it is the book. Tap to close it.";
    };
    var finishIntro = function () {
      if (introDone) return;
      introDone = true;
      fold.removeAttribute("data-autoplay");
      setState("open");
    };
    if (reduce || !fold.hasAttribute("data-autoplay")) {
      finishIntro();
    } else {
      /* the CSS intro runs on its own; hand control to the button once it has finished */
      window.setTimeout(finishIntro, 2500);
    }
    fold.addEventListener("click", function () {
      finishIntro();
      userTouched = true;
      setState(fold.getAttribute("data-state") === "closed" ? "open" : "closed");
    });
    /* leaving the hero closes the book; coming back opens it, unless the reader has taken over */
    if (hero && "IntersectionObserver" in window && !reduce) {
      var heroIo = new IntersectionObserver(function (entries) {
        var ratio = entries[0].intersectionRatio;
        if (!introDone || userTouched) return;
        if (ratio < 0.3 && fold.getAttribute("data-state") === "open") setState("closed");
        else if (ratio > 0.55 && fold.getAttribute("data-state") === "closed") setState("open");
      }, { threshold: [0, 0.3, 0.55, 1] });
      heroIo.observe(hero);
    }
  }

  /* ---------------------------------------------------------- reveals */
  var items = document.querySelectorAll("[data-reveal]");
  if (!items.length) return;
  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach(function (el) { el.classList.add("in"); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  items.forEach(function (el) { io.observe(el); });
})();
