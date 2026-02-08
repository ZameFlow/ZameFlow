/* ZameFlow Site Scripts
   Keep JS minimal and resilient for static hosting.
*/
(function () {
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function normalizePath(path) {
    // Remove query/hash and ensure trailing slash handling
    return (path || '/').split('?')[0].split('#')[0];
  }

  ready(function () {
    // 1) Current year
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });

    // 2) Mobile menu toggle
    var toggle = document.querySelector('[data-menu-toggle]');
    var menu = document.querySelector('[data-menu]');
    if (toggle && menu) {
      toggle.addEventListener('click', function () {
        var isOpen = menu.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      // Close menu when clicking outside
      document.addEventListener('click', function (e) {
        if (!menu.classList.contains('is-open')) return;
        var within = menu.contains(e.target) || toggle.contains(e.target);
        if (!within) {
          menu.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // 3) Active nav link
    var current = normalizePath(window.location.pathname);
    // For GitHub Pages project sites, pathname may contain /<repo>/...
    // We match by ending segment where possible.
    document.querySelectorAll('a.nav-link[data-nav]').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (!href || href.startsWith('mailto:') || href.startsWith('http')) return;
      var target = normalizePath(new URL(href, window.location.href).pathname);
      if (current === target || current.endsWith(target)) {
        a.classList.add('is-active');
      }
    });
  });
})();
