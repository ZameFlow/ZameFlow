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

    // 4) Language dropdown logic (flag button)
    var langOrder = ["pl", "en", "de", "es", "it", "fr"];
    var langFlags = {
      pl: "🇵🇱", en: "🇬🇧", de: "🇩🇪", es: "🇪🇸", it: "🇮🇹", fr: "🇫🇷"
    };
    var langFiles = {
      pl: "assets/i18n/pl.json",
      en: "assets/i18n/en.json",
      de: "assets/i18n/de.json",
      es: "assets/i18n/es.json",
      it: "assets/i18n/it.json",
      fr: "assets/i18n/fr.json"
    };
    var langDropdown = document.querySelector('.lang-dropdown');
    var langBtn = document.querySelector('.lang-btn');
    var langList = document.getElementById('lang-list');
    var currentFlag = document.getElementById('current-flag');
    function setFlag(lang) {
      if (currentFlag && langFlags[lang]) currentFlag.textContent = langFlags[lang];
    }
    function closeLangList() {
      if (langDropdown) langDropdown.classList.remove('open');
    }
    if (langBtn && langList) {
      langBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        langDropdown.classList.toggle('open');
      });
      langList.querySelectorAll('a[data-lang]').forEach(function(a) {
        a.addEventListener('click', function(e) {
          e.preventDefault();
          var lang = a.getAttribute('data-lang');
          localStorage.setItem('lang', lang);
          setFlag(lang);
          closeLangList();
          loadLang(lang);
        });
      });
      document.addEventListener('click', function(e) {
        if (!langDropdown.contains(e.target)) closeLangList();
      });
      // Set initial flag
      var userLang = (localStorage.getItem('lang') || navigator.language.slice(0,2) || 'pl');
      if (!langOrder.includes(userLang)) userLang = 'pl';
      setFlag(userLang);
      loadLang(userLang);
    }
    function loadLang(lang) {
      var file = langFiles[lang] || langFiles['pl'];
      fetch(file).then(function (r) { return r.json(); }).then(function (dict) {
        // Example: update all elements with data-i18n="app.habitswipe.title"
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
          var key = el.getAttribute('data-i18n');
          var val = key.split('.').reduce(function (o, k) { return (o||{})[k]; }, dict);
          if (val) el.textContent = val;
        });
        // Optionally update placeholders, titles, etc.
        document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
          var key = el.getAttribute('data-i18n-placeholder');
          var val = key.split('.').reduce(function (o, k) { return (o||{})[k]; }, dict);
          if (val) el.setAttribute('placeholder', val);
        });
      });
    }
  });
})();
