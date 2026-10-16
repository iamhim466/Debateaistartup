// Scroll reveals, meter fills and typewriter replies.
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var targets = document.querySelectorAll('.hero > div, .hero > aside, .round > *, .method .step, .quote, section.block > .wrap > .kicker, section.block > .wrap > h2, .plans > .plan');

  function prep(b) {
    var n = b.lastChild;
    if (!n || n.nodeType !== 3) return;
    var t = document.createElement('span'), r = document.createElement('span');
    r.textContent = n.textContent;
    r.style.visibility = 'hidden';
    b.replaceChild(r, n);
    b.insertBefore(t, r);
    b._t = t; b._r = r;
  }
  function type(b) {
    if (!b._r || b._typing) return;
    b._typing = true;
    (function step() {
      var rest = b._r.textContent;
      if (!rest) return;
      b._t.textContent += rest[0];
      b._r.textContent = rest.slice(1);
      setTimeout(step, 22);
    })();
  }

  if (reduce || !('IntersectionObserver' in window)) return;
  document.querySelectorAll('.bubble.opp').forEach(prep);

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      var bs = e.target.matches('.bubble.opp') ? [e.target] : e.target.querySelectorAll('.bubble.opp');
      bs.forEach(function (b) { setTimeout(function () { type(b); }, 700); });
      io.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });

  targets.forEach(function (el) { el.classList.add('reveal'); io.observe(el); });
})();
