/* ZameFlow Site Scripts
   Keep JS minimal and resilient for static hosting.
*/
(function () {
  function forceTopNavigation(url, replace) {
    try {
      if (window.top && window.top !== window) {
        if (replace && window.top.location && typeof window.top.location.replace === 'function') {
          window.top.location.replace(url);
          return;
        }
        if (window.top.location) {
          window.top.location.href = url;
          return;
        }
      }
    } catch (e) {
      // Ignore cross-frame access issues and fallback to current window.
    }
    if (replace) window.location.replace(url);
    else window.location.href = url;
  }

  function normalizePathOnly(path) {
    return (path || '/').split('?')[0].split('#')[0];
  }

  function enforceExpectedPagePath() {
    var expected = document.documentElement.getAttribute('data-page-path');
    if (!expected) return;
    var current = normalizePathOnly(window.location.pathname);
    var target = normalizePathOnly(expected);
    if (current === target) return;
    var targetUrl = expected + (window.location.search || '') + (window.location.hash || '');
    forceTopNavigation(targetUrl, true);
  }

  enforceExpectedPagePath();

  var LAST_PATH_KEY = 'zf:last-path';
  var LAST_PATH_TS_KEY = 'zf:last-path-ts';
  var LAST_PATH_KEY_PERSIST = 'zf:last-path-persist';
  var LAST_PATH_TS_KEY_PERSIST = 'zf:last-path-ts-persist';
  var ALLOW_ROOT_UNTIL_KEY = 'zf:allow-root-until';
  var RECENT_PATH_TTL_MS = 180000;

  function isRootPath(pathname) {
    return pathname === '/' || pathname === '/index.html' || /^\/(?:ZameFlow\/)?$/.test(pathname);
  }

  function restorePathAfterUnexpectedRootLoad() {
    var currentPath = window.location.pathname || '/';
    if (!isRootPath(currentPath)) return;

    var navEntry = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || null;
    var navType = navEntry && navEntry.type ? navEntry.type : null;
    var sameOriginReferrerPath = null;
    try {
      if (document.referrer) {
        var refUrl = new URL(document.referrer);
        if (refUrl.origin === window.location.origin) {
          sameOriginReferrerPath = refUrl.pathname + refUrl.search + refUrl.hash;
        }
      }
    } catch (e) {}
    var shouldRecover = (navType === 'reload') || (sameOriginReferrerPath && !isRootPath(sameOriginReferrerPath));
    if (!shouldRecover) return;

    try {
      var allowRootUntil = Number(sessionStorage.getItem(ALLOW_ROOT_UNTIL_KEY) || '0');
      if (allowRootUntil && Date.now() <= allowRootUntil) {
        sessionStorage.removeItem(ALLOW_ROOT_UNTIL_KEY);
        return;
      }
    } catch (e) {}

    var sessionPath = null;
    var persistPath = null;
    var lastTs = 0;
    try {
      sessionPath = sessionStorage.getItem(LAST_PATH_KEY);
      persistPath = localStorage.getItem(LAST_PATH_KEY_PERSIST);
      var sessionTs = Number(sessionStorage.getItem(LAST_PATH_TS_KEY) || '0');
      var persistTs = Number(localStorage.getItem(LAST_PATH_TS_KEY_PERSIST) || '0');
      lastTs = Math.max(sessionTs, persistTs);
    } catch (e) {
      // ignore storage access errors
    }

    var lastPath = sessionPath || persistPath;
    if (!lastPath || isRootPath(lastPath)) return;
    if (!lastTs || (Date.now() - lastTs) > RECENT_PATH_TTL_MS) return;

    forceTopNavigation(lastPath, true);
  }

  function rememberCurrentPath() {
    try {
      var fullPath = (window.location.pathname || '/') + (window.location.search || '') + (window.location.hash || '');
      sessionStorage.setItem(LAST_PATH_KEY, fullPath);
      sessionStorage.setItem(LAST_PATH_TS_KEY, String(Date.now()));
      localStorage.setItem(LAST_PATH_KEY_PERSIST, fullPath);
      localStorage.setItem(LAST_PATH_TS_KEY_PERSIST, String(Date.now()));
    } catch (e) {}
  }

  restorePathAfterUnexpectedRootLoad();
  rememberCurrentPath();

  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  function scrollToTopNow() {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }
  function markI18nReady() {
    document.documentElement.classList.remove('i18n-pending');
  }

  window.addEventListener('pageshow', function () {
    scrollToTopNow();
  });

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function normalizePath(path) {
    // Remove query/hash and ensure trailing slash handling
    return (path || '/').split('?')[0].split('#')[0];
  }

  ready(function () {
    scrollToTopNow();

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

    // Force internal links to perform top-level navigation (no embedded-shell URL lag).
    document.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('http')) return;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var targetUrl = new URL(href, window.location.href);
        forceTopNavigation(targetUrl.pathname + targetUrl.search + targetUrl.hash, false);
      });
    });

    // Explicit navigation to homepage should not be auto-overridden by root-recovery.
    function markAllowRootOnce() {
      try {
        sessionStorage.setItem(ALLOW_ROOT_UNTIL_KEY, String(Date.now() + 8000));
      } catch (e) {}
    }
    document.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (!href || href.startsWith('mailto:') || href.startsWith('http')) return;
      var target = normalizePath(new URL(href, window.location.href).pathname);
      if (!isRootPath(target)) return;
      a.addEventListener('click', markAllowRootOnce);
    });

    // 3b) Back button
    document.querySelectorAll('[data-back-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var fallback = btn.getAttribute('data-back-fallback') || '/';
        if (window.history.length > 1) {
          window.history.back();
          return;
        }
        forceTopNavigation(fallback, false);
      });
    });

    // 4) Language dropdown logic (flag button)
    var langOrder = [
      "pl","en","de","es","it","fr","uk","cs","ro","hu","el","nl","pt","sv","da","fi","no","tr",
      "bs","et","ga","hr","is","lt","lv","mk","mt","sk","sl","sq","sr",
      "zh","hi","ar","bn","ur","id","ja","ko","vi","th","fa"
    ];
    var langFlags = {
      pl: "🇵🇱",
      en: "🇺🇸",
      de: "🇩🇪",
      es: "🇪🇸",
      it: "🇮🇹",
      fr: "🇫🇷",
      uk: "🇺🇦",
      cs: "🇨🇿",
      ro: "🇷🇴",
      hu: "🇭🇺",
      el: "🇬🇷",
      nl: "🇳🇱",
      pt: "🇵🇹",
      sv: "🇸🇪",
      da: "🇩🇰",
      fi: "🇫🇮",
      no: "🇳🇴",
      tr: "🇹🇷",
      bs: "🇧🇦",
      et: "🇪🇪",
      ga: "🇮🇪",
      hr: "🇭🇷",
      is: "🇮🇸",
      lt: "🇱🇹",
      lv: "🇱🇻",
      mk: "🇲🇰",
      mt: "🇲🇹",
      sk: "🇸🇰",
      sl: "🇸🇮",
      sq: "🇦🇱",
      sr: "🇷🇸",
      zh: "🇨🇳",
      hi: "🇮🇳",
      ar: "🇸🇦",
      bn: "🇧🇩",
      ur: "🇵🇰",
      id: "🇮🇩",
      ja: "🇯🇵",
      ko: "🇰🇷",
      vi: "🇻🇳",
      th: "🇹🇭",
      fa: "🇮🇷"
    };
    var I18N_CACHE_VERSION = 'v16';
    var dictMemoryCache = {};
    var dictPromiseCache = {};
    var siteScript = document.querySelector('script[src*="assets/site.js"]');
    var siteScriptUrl = siteScript
      ? new URL(siteScript.getAttribute('src'), window.location.href)
      : new URL('assets/site.js', window.location.href);
    var langDropdown = document.querySelector('.lang-dropdown');
    var langBtn = document.querySelector('.lang-btn');
    var langList = document.getElementById('lang-list');
    var currentFlag = document.getElementById('current-flag');
    function flagToTwemojiSvgUrl(emoji) {
      var codepoints = Array.from(emoji).map(function (ch) {
        return ch.codePointAt(0).toString(16);
      }).join('-');
      return 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/' + codepoints + '.svg';
    }
    function fallbackFlagDataUrl() {
      return 'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22">' +
        '<rect width="22" height="22" rx="4" fill="#0f0f0f"/>' +
        '<path d="M8 4v14" stroke="#d1d5db" stroke-width="1.4"/>' +
        '<path d="M9 5h8l-2.2 2 2.2 2H9z" fill="#ffffff"/>' +
        '<rect x="0.5" y="0.5" width="21" height="21" rx="3.5" fill="none" stroke="rgba(255,255,255,.22)"/>' +
        '</svg>'
      );
    }
    function localFlagUrl(lang) {
      return new URL('flags/' + lang + '.svg', siteScriptUrl).href;
    }
    function createFlagNode(lang) {
      var emoji = langFlags[lang] || "🏳️";
      var wrap = document.createElement('span');
      wrap.className = 'flag-inner';

      var img = document.createElement('img');
      img.className = 'flag-image';
      img.alt = '';
      img.decoding = 'async';
      img.loading = 'eager';
      img.style.display = 'block';
      img.style.width = '100%';
      img.style.height = '100%';

      var sourceStage = 0;
      var sources = [
        localFlagUrl(lang),
        flagToTwemojiSvgUrl(emoji),
        fallbackFlagDataUrl()
      ];
      function setSource(index) {
        sourceStage = index;
        img.src = sources[index];
      }
      img.addEventListener('error', function () {
        if (sourceStage < sources.length - 1) {
          setSource(sourceStage + 1);
        }
      });

      setSource(0);
      wrap.appendChild(img);
      return wrap;
    }
    function normalizeLangCode(lang) {
      if (typeof lang !== 'string') return null;
      var normalized = lang.trim().toLowerCase();
      if (!normalized) return null;
      if (normalized === 'gb') return 'en';
      return normalized;
    }
    function getLangColumnCount(count) {
      if (count <= 12) return 3;
      if (count <= 20) return 4;
      if (count <= 30) return 5;
      if (count <= 42) return 6;
      return 7;
    }
    function applyLangGridColumns() {
      if (!langList) return;
      var cols = getLangColumnCount(langOrder.length);
      langList.style.setProperty('--lang-cols', String(cols));
    }
    function buildLangList() {
      if (!langList) return;
      applyLangGridColumns();
      langList.innerHTML = '';
      langOrder.forEach(function (lang) {
        var a = document.createElement('a');
        a.href = '#';
        a.setAttribute('data-lang', lang);
        a.setAttribute('aria-label', lang.toUpperCase());
        a.textContent = '';
        a.appendChild(createFlagNode(lang));
        langList.appendChild(a);
      });
    }
    function setFlag(lang) {
      if (!currentFlag || !langFlags[lang]) return;
      currentFlag.textContent = '';
      currentFlag.appendChild(createFlagNode(lang));
      currentFlag.setAttribute('aria-label', lang.toUpperCase());
    }
    function closeLangList() {
      if (langDropdown) langDropdown.classList.remove('open');
    }
    function readLangCookie() {
      try {
        var m = document.cookie.match(/(?:^|; )lang=([^;]+)/);
        return m ? normalizeLangCode(decodeURIComponent(m[1])) : null;
      } catch (e) {
        return null;
      }
    }
    function persistLang(lang) {
      var normalized = normalizeLangCode(lang);
      if (!normalized || !langOrder.includes(normalized)) normalized = 'pl';
      try { localStorage.setItem('lang', normalized); } catch (e) {}
      try { sessionStorage.setItem('lang', normalized); } catch (e) {}
      try { document.cookie = 'lang=' + encodeURIComponent(normalized) + '; path=/; max-age=31536000; SameSite=Lax'; } catch (e) {}
      return normalized;
    }
    function getInitialLang() {
      var hinted = normalizeLangCode(document.documentElement.getAttribute('data-lang-init'));
      var ls = null;
      var ss = null;
      try { ls = localStorage.getItem('lang'); } catch (e) {}
      try { ss = sessionStorage.getItem('lang'); } catch (e) {}
      var ck = readLangCookie();
      var nav = normalizeLangCode((navigator.language || 'pl').slice(0, 2));
      var candidates = [ls, ss, ck, hinted, nav, 'pl'];
      for (var i = 0; i < candidates.length; i++) {
        var candidate = normalizeLangCode(candidates[i]);
        if (!candidate) continue;
        if (langOrder.includes(candidate)) return candidate;
      }
      return 'pl';
    }
    function dictStorageKey(lang) {
      return 'i18n:' + I18N_CACHE_VERSION + ':' + lang;
    }
    function clearOldI18nStorage() {
      try {
        for (var i = localStorage.length - 1; i >= 0; i--) {
          var key = localStorage.key(i);
          if (!key || key.indexOf('i18n:') !== 0) continue;
          if (key.indexOf('i18n:' + I18N_CACHE_VERSION + ':') === 0) continue;
          localStorage.removeItem(key);
        }
      } catch (e) {
        // Ignore storage access errors.
      }
    }
    function readDictFromStorage(lang) {
      try {
        var raw = localStorage.getItem(dictStorageKey(lang));
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    }
    function writeDictToStorage(lang, dict) {
      try {
        localStorage.setItem(dictStorageKey(lang), JSON.stringify(dict));
      } catch (e) {
        // Ignore storage quota/privacy errors.
      }
    }
    function getDictValue(dict, key) {
      return key.split('.').reduce(function (o, k) { return (o || {})[k]; }, dict);
    }
    function applyDict(dict) {
      document.querySelectorAll('[data-i18n]').forEach(function (el) {
        var key = el.getAttribute('data-i18n');
        var val = getDictValue(dict, key);
        if (val) el.textContent = val;
      });
      document.querySelectorAll('[data-i18n-content]').forEach(function (el) {
        var key = el.getAttribute('data-i18n-content');
        var val = getDictValue(dict, key);
        if (val) el.setAttribute('content', val);
      });
      document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
        var key = el.getAttribute('data-i18n-placeholder');
        var val = getDictValue(dict, key);
        if (val) el.setAttribute('placeholder', val);
      });
      document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
        var key = el.getAttribute('data-i18n-title');
        var val = getDictValue(dict, key);
        if (val) el.setAttribute('title', val);
      });
      document.querySelectorAll('[data-i18n-aria-label]').forEach(function (el) {
        var key = el.getAttribute('data-i18n-aria-label');
        var val = getDictValue(dict, key);
        if (val) el.setAttribute('aria-label', val);
      });
    }
    function fetchDict(lang) {
      var selected = langOrder.includes(lang) ? lang : 'pl';
      if (dictMemoryCache[selected]) {
        return Promise.resolve(dictMemoryCache[selected]);
      }
      var localDict = readDictFromStorage(selected);
      if (localDict) {
        dictMemoryCache[selected] = localDict;
        return Promise.resolve(localDict);
      }
      if (dictPromiseCache[selected]) return dictPromiseCache[selected];
      var dictUrl = new URL('i18n/' + selected + '.json', siteScriptUrl);
      dictUrl.searchParams.set('v', I18N_CACHE_VERSION);
      var file = dictUrl.href;
      dictPromiseCache[selected] = fetch(file, { cache: 'force-cache' })
        .then(function (r) { return r.json(); })
        .then(function (dict) {
          dictMemoryCache[selected] = dict;
          writeDictToStorage(selected, dict);
          return dict;
        })
        .catch(function () {
          return readDictFromStorage(selected) || dictMemoryCache[selected] || {};
        })
        .finally(function () {
          delete dictPromiseCache[selected];
        });
      return dictPromiseCache[selected];
    }
    function preloadAllLangs(activeLang) {
      langOrder.forEach(function (lang) {
        if (lang === activeLang) return;
        fetchDict(lang);
      });
    }
    clearOldI18nStorage();
    var userLang = getInitialLang();
    userLang = persistLang(userLang);
    setFlag(userLang);
    fetchDict(userLang).then(applyDict).finally(function () {
      markI18nReady();
      // Warm up other dictionaries in the background for instant switching.
      setTimeout(function () { preloadAllLangs(userLang); }, 0);
    });

    if (langBtn && langList && langDropdown) {
      buildLangList();
      langBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        langDropdown.classList.toggle('open');
      });
      langList.querySelectorAll('a[data-lang]').forEach(function(a) {
        a.addEventListener('click', function(e) {
          e.preventDefault();
          var lang = normalizeLangCode(a.getAttribute('data-lang'));
          if (!lang || !langOrder.includes(lang)) return;
          persistLang(lang);
          setFlag(lang);
          closeLangList();
          loadLang(lang);
        });
      });
      document.addEventListener('click', function(e) {
        if (!langDropdown.contains(e.target)) closeLangList();
      });
    }
    function loadLang(lang) {
      fetchDict(lang).then(applyDict).finally(markI18nReady);
    }
  });
})();
