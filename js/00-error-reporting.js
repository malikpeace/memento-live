/* Privacy-safe runtime error reporting.
   Raw messages, stack strings, URLs, app state, and user content never leave
   this device. They are converted into fixed technical labels first. */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://lipuxymlsowdrbummqxw.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcHV4eW1sc293ZHJidW1tcXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMjI1MDIsImV4cCI6MjA5NjY5ODUwMn0.mbTRo2CFz9q9dtQTzgI3655f6KIY09fUyCqI1F0RkyU';
  const ENDPOINT = SUPABASE_URL + '/functions/v1/report-client-error';
  const QUEUE_KEY = 'memento_safe_error_queue_v1';
  const DEVICE_KEY = 'memento_error_reporter_id';
  const MAX_QUEUE = 20;
  const BREADCRUMBS = new Set([
    'app_boot', 'app_ready', 'became_hidden', 'became_visible',
    'network_offline', 'network_online', 'sync_pull', 'sync_push'
  ]);
  const ENDPOINTS = new Set([
    'account_delete', 'ai_proxy', 'auth', 'cloud_sync',
    'ics_proxy', 'push', 'unknown'
  ]);
  const PHASES = new Set([
    'boot', 'delete', 'fetch', 'flush', 'pull',
    'push', 'reauth', 'render', 'restore', 'unknown'
  ]);

  let breadcrumbs = ['app_boot'];
  let flushTimer = null;
  let flushing = false;
  const recent = new Map();

  function reportEnabled() {
    const host = location.hostname;
    if (host === 'malikpeace.github.io' || host === 'mementoapp.co' || host === 'www.mementoapp.co') {
      return true;
    }
    return /[?&]reportErrors=1(?:&|$)/.test(location.search || '');
  }

  function classifyError(error, fallback) {
    const name = String(error && error.name || '');
    const message = String(error && error.message || fallback || '').toLowerCase();
    if (name === 'AbortError' || /\babort(?:ed)?\b/.test(message)) return 'abort_error';
    if (name === 'TimeoutError' || /\btime(?:d)?\s*out\b/.test(message)) return 'timeout_error';
    if (name === 'QuotaExceededError' || /quota|storage.*full/.test(message)) return 'quota_exceeded';
    if (name === 'SecurityError') return 'security_error';
    if (name === 'SyntaxError' && /json|unexpected token/.test(message)) return 'json_parse_error';
    if (name === 'SyntaxError') return 'syntax_error';
    if (name === 'ReferenceError') return 'reference_error';
    if (name === 'RangeError') return 'range_error';
    if (name === 'TypeError') return 'type_error';
    if (/failed to fetch|networkerror|network request failed|load failed/.test(message)) return 'network_error';
    if (/localstorage|indexeddb|storage/.test(message)) return 'storage_error';
    return fallback === 'promise' ? 'promise_rejection' : 'unknown_error';
  }

  function safeSource(value) {
    try {
      if (!value) return 'unknown';
      const url = new URL(String(value), location.href);
      if (url.origin !== location.origin) return 'external_script';
      const base = url.pathname.split('/').pop() || '';
      if (base === 'index.html' || base === 'sw.js') return base;
      if (/^\d{2}-[a-z0-9-]+\.js$/.test(base)) return base.slice(0, 100);
    } catch (_) {}
    return value === 'inline' ? 'inline' : 'unknown';
  }

  function safeNumber(value, max) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 && number <= max ? number : null;
  }

  function safeFunctionName(value) {
    const name = String(value || '');
    // Function names are uncontrolled stack content. A generated function
    // could contain user text, so retain only whether a frame was named.
    return name && name.length <= 64 && /^[A-Za-z0-9_$.[\]<>-]+$/.test(name)
      ? 'named'
      : 'anonymous';
  }

  function safeStack(error) {
    const raw = String(error && error.stack || '');
    if (!raw) return [];
    return raw.split('\n').slice(1, 9).map(function (line) {
      const fnMatch = line.match(/\bat\s+([A-Za-z0-9_$.[\]<>-]+)/);
      const sourceMatch = line.match(/((?:\d{2}-[a-z0-9-]+|sw)\.js)(?:\?[^:\s)]*)?:(\d+):(\d+)/i);
      return {
        function: safeFunctionName(fnMatch && fnMatch[1]),
        source: safeSource(sourceMatch && sourceMatch[1]),
        line: safeNumber(sourceMatch && sourceMatch[2], 2000000),
        column: safeNumber(sourceMatch && sourceMatch[3], 100000)
      };
    });
  }

  function browserName() {
    const ua = navigator.userAgent || '';
    if (/Edg\//.test(ua)) return 'edge';
    if (/CriOS|Chrome\//.test(ua)) return 'chrome';
    if (/FxiOS|Firefox\//.test(ua)) return 'firefox';
    if (/Safari\//.test(ua) && !/Chrome|CriOS|Android/.test(ua)) return 'safari';
    if (/\bwv\b|WebView/.test(ua)) return 'webview';
    return 'other';
  }

  function osName() {
    const ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    if (/Windows/.test(ua)) return 'windows';
    if (/Macintosh|Mac OS X/.test(ua)) return 'macos';
    if (/Linux/.test(ua)) return 'linux';
    return 'other';
  }

  function surfaceName() {
    const hash = String(location.hash || '').replace(/^#/, '').split(/[/?]/, 1)[0];
    const allowed = new Set(['action', 'clarity', 'home', 'onboarding', 'profile', 'reflect', 'settings']);
    if (allowed.has(hash)) return hash;
    try {
      if (document.querySelector('.clarity-experience:not(.hidden)')) return 'clarity';
      if (document.querySelector('.action-experience:not(.hidden)')) return 'action';
      if (document.getElementById('splash') && !document.getElementById('splash').classList.contains('dismissed')) {
        return 'onboarding';
      }
    } catch (_) {}
    return 'home';
  }

  function viewportName() {
    const width = Math.max(0, Number(window.innerWidth) || 0);
    return width < 600 ? 'small' : (width < 1100 ? 'medium' : 'large');
  }

  function appVersion() {
    const value = String(window.MEMENTO_VERSION || 'unknown');
    return /^(?:v\d{1,8}|dev)$/.test(value) ? value : 'unknown';
  }

  function context() {
    return {
      app_version: appVersion(),
      surface: surfaceName(),
      browser: browserName(),
      os: osName(),
      display_mode: window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
        ? 'pwa'
        : 'browser',
      viewport: viewportName(),
      online: navigator.onLine !== false,
      low_fx: window.__LOWFX === true,
      breadcrumbs: breadcrumbs.slice(-8)
    };
  }

  function queue() {
    try {
      const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.slice(-MAX_QUEUE) : [];
    } catch (_) {
      return [];
    }
  }

  function saveQueue(events) {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(events.slice(-MAX_QUEUE)));
    } catch (_) {}
  }

  function deviceId() {
    try {
      let id = localStorage.getItem(DEVICE_KEY);
      if (!/^[A-Za-z0-9:_-]{8,80}$/.test(id || '')) {
        id = 'err-' + (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
        localStorage.setItem(DEVICE_KEY, id);
      }
      return id;
    } catch (_) {
      return 'err-memory-only';
    }
  }

  function enqueue(event) {
    if (!reportEnabled()) return;
    const key = [event.event_type, event.code, event.source, event.line || 0].join(':');
    const now = Date.now();
    if ((recent.get(key) || 0) > now - 10000) return;
    recent.set(key, now);
    if (recent.size > 40) {
      recent.forEach(function (time, item) {
        if (time < now - 60000) recent.delete(item);
      });
    }

    const events = queue();
    events.push(event);
    saveQueue(events);
    scheduleFlush();
  }

  function scheduleFlush() {
    if (flushTimer || flushing || navigator.onLine === false) return;
    flushTimer = setTimeout(function () {
      flushTimer = null;
      flush();
    }, 1200);
  }

  async function flush() {
    if (flushing || navigator.onLine === false) return;
    const events = queue().slice(0, 10);
    if (!events.length) return;
    flushing = true;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(function () { controller.abort(); }, 8000);
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + SUPABASE_ANON,
          'apikey': SUPABASE_ANON,
          'x-memento-device': deviceId()
        },
        body: JSON.stringify({ events: events }),
        signal: controller.signal,
        keepalive: true
      });
      clearTimeout(timeout);
      if (response.ok) {
        const remaining = queue().slice(events.length);
        saveQueue(remaining);
      }
    } catch (_) {
      // Sanitized reports remain queued for the next online app session.
    } finally {
      flushing = false;
      if (queue().length && navigator.onLine !== false) {
        flushTimer = setTimeout(function () {
          flushTimer = null;
          flush();
        }, 30000);
      }
    }
  }

  function reportError(event) {
    try {
      const error = event && event.error;
      enqueue({
        event_type: 'window_error',
        code: classifyError(error, event && event.message),
        source: safeSource(event && event.filename || 'inline'),
        line: safeNumber(event && event.lineno, 2000000),
        column: safeNumber(event && event.colno, 100000),
        stack: safeStack(error),
        context: context()
      });
    } catch (_) {}
  }

  function reportResourceError(event) {
    try {
      const target = event && event.target;
      if (!target || target === window) return;
      const source = target.src || target.href || '';
      enqueue({
        event_type: 'resource_error',
        code: 'resource_load_error',
        source: safeSource(source),
        line: null,
        column: null,
        stack: [],
        context: context()
      });
    } catch (_) {}
  }

  function reportRejection(event) {
    try {
      const reason = event && event.reason;
      enqueue({
        event_type: 'unhandled_rejection',
        code: classifyError(reason, 'promise'),
        source: 'unknown',
        line: null,
        column: null,
        stack: safeStack(reason),
        context: context()
      });
    } catch (_) {}
  }

  function reportBackend(details) {
    try {
      const endpoint = ENDPOINTS.has(details && details.endpoint) ? details.endpoint : 'unknown';
      const phase = PHASES.has(details && details.phase) ? details.phase : 'unknown';
      const status = Number.isInteger(Number(details && details.status))
        ? Math.max(0, Math.min(599, Number(details.status)))
        : null;
      enqueue({
        event_type: 'backend_failure',
        code: status === 0 ? 'network_error' : (status === 408 || status === 504 ? 'timeout_error' : 'unknown_error'),
        source: 'unknown',
        line: null,
        column: null,
        stack: [],
        context: context(),
        endpoint: endpoint,
        status: status,
        phase: phase
      });
    } catch (_) {}
  }

  function mark(value) {
    if (!BREADCRUMBS.has(value)) return;
    breadcrumbs.push(value);
    breadcrumbs = breadcrumbs.slice(-8);
  }

  window.addEventListener('error', function (event) {
    if (event && event.target && event.target !== window) reportResourceError(event);
    else reportError(event);
  }, true);
  window.addEventListener('unhandledrejection', reportRejection);
  window.addEventListener('load', function () { mark('app_ready'); scheduleFlush(); });
  window.addEventListener('online', function () { mark('network_online'); scheduleFlush(); });
  window.addEventListener('offline', function () { mark('network_offline'); });
  document.addEventListener('visibilitychange', function () {
    mark(document.hidden ? 'became_hidden' : 'became_visible');
    if (!document.hidden) scheduleFlush();
  });

  window.MementoErrors = Object.freeze({
    mark: mark,
    reportBackend: reportBackend,
    flush: flush
  });
  scheduleFlush();
})();
