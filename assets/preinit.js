/* ZameFlow pre-initialization
   Runs before the main app script so language + path are stable on first paint.
*/
(function () {
  function normalizeLangCode(lang) {
    if (typeof lang !== 'string') return null;
    var normalized = lang.trim().toLowerCase();
    if (!normalized) return null;
    if (normalized === 'gb') return 'en';
    return normalized;
  }

  function getSupportedLangs() {
    return [
      'pl', 'en', 'de', 'es', 'it', 'fr', 'uk', 'cs', 'ro', 'hu', 'el', 'nl', 'pt', 'sv', 'da', 'fi', 'no', 'tr',
      'bs', 'et', 'ga', 'hr', 'is', 'lt', 'lv', 'mk', 'mt', 'sk', 'sl', 'sq', 'sr',
      'zh', 'hi', 'ar', 'bn', 'ur', 'id', 'ja', 'ko', 'vi', 'th', 'fa'
    ];
  }

  function forceTopNavigation(url) {
    try {
      if (window.top && window.top !== window && window.top.location) {
        window.top.location.replace(url);
        return;
      }
    } catch (e) {
      // Ignore cross-frame issues and fallback to current window.
    }
    window.location.replace(url);
  }

  function enforceExpectedPath() {
    var expected = document.documentElement.getAttribute('data-page-path');
    if (!expected) return;

    var currentPath = (window.location.pathname || '/').split('?')[0].split('#')[0];
    if (currentPath === expected) return;

    var target = expected + (window.location.search || '') + (window.location.hash || '');
    forceTopNavigation(target);
  }

  function selectInitialLanguage() {
    var supported = getSupportedLangs();
    var ls = null;
    var ss = null;

    try {
      ls = normalizeLangCode(localStorage.getItem('lang'));
    } catch (e) {}

    try {
      ss = normalizeLangCode(sessionStorage.getItem('lang'));
    } catch (e) {}

    var ck = null;
    try {
      var match = document.cookie.match(/(?:^|; )lang=([^;]+)/);
      ck = match ? normalizeLangCode(decodeURIComponent(match[1])) : null;
    } catch (e) {}

    var nav = normalizeLangCode((navigator.language || 'pl').slice(0, 2));
    var candidates = [ls, ss, ck, nav, 'pl'];

    for (var i = 0; i < candidates.length; i++) {
      var candidate = normalizeLangCode(candidates[i]);
      if (candidate && supported.indexOf(candidate) !== -1) {
        return candidate;
      }
    }

    return 'pl';
  }

  try {
    enforceExpectedPath();

    var initialLang = selectInitialLanguage();
    document.documentElement.setAttribute('data-lang-init', initialLang);
    if (initialLang !== 'en') {
      document.documentElement.classList.add('i18n-pending');
    }
  } catch (e) {
    document.documentElement.setAttribute('data-lang-init', 'pl');
    document.documentElement.classList.add('i18n-pending');
  }
})();
