(() => {
  const styleId = 'nuva-report-reader-style';
  const tocId = 'nuva-report-reader';
  const searchId = 'nuva-report-search';
  const progressId = 'nuva-report-progress';

  const icons = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    section: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 6h16"/><path d="M4 12h12"/><path d="M4 18h8"/></svg>',
    page: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'
  };
  const adminStorageKey = 'nuva-report-admin-auth';
  const visibilityStorageKey = 'nuva-report-visibility-overrides';
  const guestPinStorageKey = 'nuva-report-guest-pins';
  const guestUnlockStorageKey = 'nuva-report-guest-unlocks';

  function readSessionValue(key) {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeSessionValue(key, value) {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      // 靜態瀏覽或隱私模式可能停用 sessionStorage，忽略即可。
    }
  }

  function readVisibilityOverrides() {
    try {
      const raw = window.localStorage.getItem(visibilityStorageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  function readCookieValue(key) {
    const prefix = `${encodeURIComponent(key)}=`;
    return String(document.cookie || '')
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix))
      ?.slice(prefix.length) || '';
  }

  function readWindowNameValue(key) {
    const prefix = `${key}:`;
    const current = String(window.name || '');
    return current.startsWith(prefix) ? decodeURIComponent(current.slice(prefix.length)) : '';
  }

  function readGuestPins() {
    function parse(raw) {
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    }

    try {
      const sessionPins = parse(window.sessionStorage.getItem(guestPinStorageKey));
      const cookiePins = parse(decodeURIComponent(readCookieValue(guestPinStorageKey) || ''));
      const windowPins = parse(readWindowNameValue(guestPinStorageKey));
      const localPins = parse(window.localStorage.getItem(guestPinStorageKey));
      return { ...localPins, ...cookiePins, ...sessionPins, ...windowPins };
    } catch {
      try {
        const sessionPins = parse(window.sessionStorage.getItem(guestPinStorageKey));
        const cookiePins = parse(decodeURIComponent(readCookieValue(guestPinStorageKey) || ''));
        const windowPins = parse(readWindowNameValue(guestPinStorageKey));
        return { ...cookiePins, ...sessionPins, ...windowPins };
      } catch {
        try {
          const cookiePins = parse(decodeURIComponent(readCookieValue(guestPinStorageKey) || ''));
          const windowPins = parse(readWindowNameValue(guestPinStorageKey));
          return { ...cookiePins, ...windowPins };
        } catch {
          return {};
        }
      }
    }
  }

  function readGuestUnlocks() {
    try {
      const raw = window.sessionStorage.getItem(guestUnlockStorageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveGuestUnlock(reportId) {
    const unlocks = readGuestUnlocks();
    unlocks[reportId] = true;
    writeSessionValue(guestUnlockStorageKey, JSON.stringify(unlocks));
  }

  function normalizePin(value) {
    return String(value || '').replace(/\D/g, '').slice(0, 4);
  }

  function reportIdFromLocation() {
    const fileName = decodeURIComponent(window.location.pathname.split('/').pop() || '');
    return fileName.replace(/\.html$/i, '');
  }

  function readReportMeta() {
    const walker = document.createTreeWalker(document, NodeFilter.SHOW_COMMENT);
    while (walker.nextNode()) {
      const value = walker.currentNode.nodeValue || '';
      if (!/report-meta/i.test(value)) continue;
      try {
        return JSON.parse(value.replace(/^\s*report-meta/i, '').trim());
      } catch {
        return {};
      }
    }
    return {};
  }

  function reportAccessState() {
    const meta = readReportMeta();
    const reportId = reportIdFromLocation();
    const overrides = readVisibilityOverrides();
    const visibility = overrides[reportId] || meta.visibility || 'public';
    const pinOverrides = readGuestPins();
    const guestPin = normalizePin(
      Object.prototype.hasOwnProperty.call(pinOverrides, reportId)
        ? pinOverrides[reportId]
        : meta.guestPin || meta.guestPassword || ''
    );
    const isAdmin = readSessionValue(adminStorageKey) === 'true';
    const unlocked = Boolean(readGuestUnlocks()[reportId]);

    return {
      reportId,
      title: meta.title || document.title || 'report',
      visibility,
      guestPin,
      shouldPrompt: visibility !== 'public' && guestPin.length === 4 && !isAdmin && !unlocked
    };
  }

  function applyVisitorLock(access) {
    if (!access.shouldPrompt || document.getElementById('visitor-pin-lock')) return false;

    let value = '';
    const overlay = document.createElement('section');
    overlay.className = 'visitor-pin-lock';
    overlay.id = 'visitor-pin-lock';
    overlay.setAttribute('aria-label', '訪客密碼');
    overlay.innerHTML = `
      <div class="visitor-pin-card" role="dialog" aria-modal="true" aria-labelledby="visitor-pin-title">
        <p class="visitor-pin-kicker">不公開連結</p>
        <h1 id="visitor-pin-title">輸入訪客密碼</h1>
        <p class="visitor-pin-copy">這份 report 未列在首頁。請輸入四位數字後繼續閱讀。</p>
        <div class="visitor-pin-digits" aria-label="四位數字密碼">
          ${Array.from({ length: 4 }, () => '<span class="visitor-pin-box">數</span>').join('')}
        </div>
        <p class="visitor-pin-error" aria-live="polite"></p>
        <div class="visitor-pin-pad" aria-label="數字鍵盤">
          ${['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((number) => `<button type="button" class="visitor-pin-key" data-pin-key="${number}">${number}</button>`).join('')}
          <button type="button" class="visitor-pin-key is-secondary" data-pin-key="clear">清除</button>
          <button type="button" class="visitor-pin-key" data-pin-key="0">0</button>
          <button type="button" class="visitor-pin-key is-secondary" data-pin-key="back">退格</button>
        </div>
      </div>
    `;

    function boxes() {
      return [...overlay.querySelectorAll('.visitor-pin-box')];
    }

    function renderValue() {
      boxes().forEach((box, index) => {
        const filled = index < value.length;
        box.classList.toggle('is-filled', filled);
        box.textContent = filled ? '●' : '數';
      });
    }

    function error(message) {
      const node = overlay.querySelector('.visitor-pin-error');
      if (node) node.textContent = message;
    }

    function pulseKey(key) {
      const button = overlay.querySelector(`[data-pin-key="${CSS.escape(key)}"]`);
      if (!button) return;
      button.classList.remove('is-pressed');
      void button.offsetWidth;
      button.classList.add('is-pressed');
      window.setTimeout(() => button.classList.remove('is-pressed'), 140);
    }

    function unlock() {
      saveGuestUnlock(access.reportId);
      document.body.classList.remove('nuva-report-locked');
      overlay.remove();
      document.removeEventListener('keydown', handleKeydown);
    }

    function submitIfReady() {
      if (value.length !== 4) return;
      if (value === access.guestPin) {
        unlock();
        return;
      }
      error('密碼不正確，請重新輸入。');
      overlay.querySelector('.visitor-pin-card')?.classList.add('is-shaking');
      window.setTimeout(() => overlay.querySelector('.visitor-pin-card')?.classList.remove('is-shaking'), 260);
      value = '';
      renderValue();
    }

    function inputKey(key) {
      if (/^\d$/.test(key)) {
        if (value.length >= 4) return;
        value += key;
        error('');
        renderValue();
        pulseKey(key);
        submitIfReady();
        return;
      }
      if (key === 'back') {
        value = value.slice(0, -1);
        renderValue();
        pulseKey(key);
        return;
      }
      if (key === 'clear') {
        value = '';
        error('');
        renderValue();
        pulseKey(key);
      }
    }

    function handleKeydown(event) {
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        inputKey(event.key);
      } else if (event.key === 'Backspace') {
        event.preventDefault();
        inputKey('back');
      } else if (event.key === 'Escape') {
        event.preventDefault();
        inputKey('clear');
      }
    }

    overlay.addEventListener('click', (event) => {
      const button = event.target.closest('[data-pin-key]');
      if (!button) return;
      inputKey(button.dataset.pinKey);
    });

    document.body.classList.add('nuva-report-locked');
    document.body.appendChild(overlay);
    document.addEventListener('keydown', handleKeydown);
    overlay.querySelector('[data-pin-key="1"]')?.focus();
    renderValue();
    return true;
  }

  function injectStyle() {
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .report-reader {
        --reader-ink: var(--report-ink, var(--ink, #162024));
        --reader-blue: var(--report-blue, var(--blue, #1d4ed8));
        --reader-paper: var(--report-paper, var(--paper, #fff));
        --reader-width: 238px;
        --reader-gap: 24px;
        --reader-edge: 18px;
        position: fixed;
        left: max(var(--reader-edge), calc((100vw - min(210mm, calc(100vw - 28px))) / 2 - var(--reader-width) - var(--reader-gap)));
        top: 18px;
        z-index: 900;
        width: var(--reader-width);
        overflow: visible;
        color: var(--reader-ink);
        font-family: "Noto Sans TC", sans-serif;
      }

      .reader-progress {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1400;
        height: 4px;
        background: color-mix(in srgb, var(--reader-blue) 8%, transparent);
        pointer-events: none;
      }

      .reader-progress-bar {
        width: 100%;
        height: 100%;
        transform: scaleX(0);
        transform-origin: left center;
        background: linear-gradient(90deg, var(--reader-blue), var(--reader-ink));
        animation: readerProgress linear both;
        animation-timeline: scroll(root block);
      }

      @supports not (animation-timeline: scroll(root block)) {
        .reader-progress-bar {
          transform: scaleX(1);
          opacity: .28;
        }
      }

      @keyframes readerProgress {
        from { transform: scaleX(0); }
        to { transform: scaleX(1); }
      }

      .reader-panel {
        display: grid;
        gap: 6px;
        padding: 8px 0;
      }

      .reader-button,
      .reader-link {
        width: 100%;
        min-height: 38px;
        display: flex;
        align-items: center;
        gap: 11px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: color-mix(in srgb, var(--reader-ink) 58%, transparent);
        padding: 0 10px;
        text-align: left;
        text-decoration: none;
        cursor: pointer;
        font-size: 14px;
        font-weight: 700;
        line-height: 1.25;
        transition: background-color .16s ease, color .16s ease, transform .16s ease;
      }

      .reader-button:hover,
      .reader-button:focus-visible,
      .reader-link:hover,
      .reader-link:focus-visible,
      .reader-link.is-active {
        background: color-mix(in srgb, var(--reader-paper) 72%, transparent);
        color: var(--reader-ink);
        outline: none;
      }

      .reader-button svg,
      .reader-link svg {
        width: 18px;
        height: 18px;
        flex: 0 0 auto;
        color: currentColor;
      }

      .reader-section-label {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 34px;
        margin-top: 5px;
        padding: 0 10px;
        color: var(--reader-ink);
        font-size: 14px;
        font-weight: 900;
      }

      .reader-section-label svg {
        width: 18px;
        height: 18px;
        color: var(--reader-blue);
      }

      .reader-list {
        margin-left: 19px;
        padding: 4px 0 6px 14px;
        border-left: 1px solid color-mix(in srgb, var(--reader-ink) 16%, transparent);
      }

      .reader-link {
        min-height: 32px;
        align-items: center;
        gap: 10px;
        padding: 6px 10px;
        color: color-mix(in srgb, var(--reader-ink) 42%, transparent);
        font-size: 13px;
        font-weight: 700;
        line-height: 1.35;
      }

      .reader-link span {
        min-width: 0;
        display: block;
        overflow: visible;
        text-overflow: clip;
        white-space: normal;
      }

      .reader-page {
        flex: 0 0 auto;
        align-self: center;
        margin-left: auto;
        padding-top: 0;
        color: color-mix(in srgb, var(--reader-ink) 34%, transparent);
        font-family: "Archivo", sans-serif;
        font-size: 11px;
        font-weight: 800;
        line-height: 1;
      }

      body.nuva-report-locked {
        overflow: hidden;
      }

      body.nuva-report-locked > :not(.visitor-pin-lock):not(script):not(style) {
        filter: blur(12px);
        opacity: .48;
        pointer-events: none;
        user-select: none;
        transition: filter .22s ease, opacity .22s ease;
      }

      .visitor-pin-lock {
        position: fixed;
        inset: 0;
        z-index: 2200;
        display: grid;
        place-items: center;
        padding: 24px;
        background:
          linear-gradient(135deg, rgba(21, 34, 63, .32), rgba(21, 34, 63, .12)),
          rgba(238, 243, 253, .54);
        backdrop-filter: blur(5px);
        color: var(--report-ink, var(--ink, #15223f));
        font-family: "Noto Sans TC", sans-serif;
      }

      .visitor-pin-card {
        width: min(430px, 100%);
        border: 2px solid var(--report-ink, var(--ink, #15223f));
        border-radius: 12px;
        background: var(--report-paper, var(--paper, #fff));
        padding: 26px;
        box-shadow: 12px 14px 0 rgba(21, 34, 63, .16);
      }

      .visitor-pin-card.is-shaking {
        animation: visitorPinShake .26s ease;
      }

      .visitor-pin-kicker {
        margin: 0 0 9px;
        color: var(--report-blue, var(--blue, #1d4ed8));
        font-size: 12px;
        font-weight: 900;
        letter-spacing: .08em;
      }

      .visitor-pin-card h1 {
        margin: 0;
        font-size: 30px;
        font-weight: 900;
        line-height: 1.25;
      }

      .visitor-pin-copy {
        margin: 12px 0 0;
        color: var(--muted, var(--ink-s, #454f6b));
        font-size: 14px;
        line-height: 1.8;
      }

      .visitor-pin-digits {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-top: 22px;
      }

      .visitor-pin-box {
        display: grid;
        place-items: center;
        height: 58px;
        border: 1px solid color-mix(in srgb, var(--report-ink, var(--ink, #15223f)) 36%, transparent);
        border-radius: 10px;
        background: color-mix(in srgb, var(--report-paper, var(--paper, #fff)) 86%, transparent);
        color: color-mix(in srgb, var(--report-ink, var(--ink, #15223f)) 28%, transparent);
        font-size: 13px;
        font-weight: 900;
        transition: border-color .16s ease, box-shadow .16s ease, color .16s ease, transform .16s ease;
      }

      .visitor-pin-box.is-filled {
        border-color: var(--report-blue, var(--blue, #1d4ed8));
        color: var(--report-ink, var(--ink, #15223f));
        box-shadow: inset 0 -4px 0 color-mix(in srgb, var(--report-blue, var(--blue, #1d4ed8)) 18%, transparent);
        transform: translateY(-1px);
      }

      .visitor-pin-error {
        min-height: 24px;
        margin: 10px 0 0;
        color: #b3261e;
        font-size: 13px;
        font-weight: 800;
      }

      .visitor-pin-pad {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 9px;
        margin-top: 6px;
      }

      .visitor-pin-key {
        min-height: 52px;
        border: 1px solid color-mix(in srgb, var(--report-ink, var(--ink, #15223f)) 42%, transparent);
        border-radius: 10px;
        background: #fff;
        color: var(--report-ink, var(--ink, #15223f));
        cursor: pointer;
        font-size: 19px;
        font-weight: 900;
        transition: transform .12s ease, background .12s ease, box-shadow .12s ease;
      }

      .visitor-pin-key:hover,
      .visitor-pin-key:focus-visible,
      .visitor-pin-key.is-pressed {
        background: var(--report-blue, var(--blue, #1d4ed8));
        color: #fff;
        outline: none;
        transform: translateY(2px);
        box-shadow: inset 0 3px 0 rgba(0, 0, 0, .16);
      }

      .visitor-pin-key.is-secondary {
        color: color-mix(in srgb, var(--report-ink, var(--ink, #15223f)) 58%, transparent);
        font-size: 14px;
      }

      @keyframes visitorPinShake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-8px); }
        50% { transform: translateX(7px); }
        75% { transform: translateX(-4px); }
      }

      .reader-search-popover {
        position: fixed;
        top: 9vh;
        left: 50%;
        z-index: 1200;
        width: min(780px, calc(100vw - 40px));
        max-height: min(760px, calc(100vh - 80px));
        display: none;
        transform: translateX(-50%);
        border: 1px solid color-mix(in srgb, var(--report-ink, var(--ink, #162024)) 8%, transparent);
        border-radius: 18px;
        background: color-mix(in srgb, var(--report-paper, var(--paper, #fff)) 98%, transparent);
        box-shadow: 0 28px 70px rgba(22, 32, 36, .24);
        color: var(--report-ink, var(--ink, #162024));
        font-family: "Noto Sans TC", sans-serif;
        overflow: hidden;
      }

      .reader-search-popover.is-open {
        display: grid;
        grid-template-rows: auto auto minmax(0, 1fr);
      }

      .reader-search-head {
        display: flex;
        align-items: center;
        gap: 13px;
        min-height: 68px;
        padding: 0 22px;
        border-bottom: 1px solid color-mix(in srgb, var(--report-ink, var(--ink, #162024)) 8%, transparent);
      }

      .reader-search-head svg {
        width: 22px;
        height: 22px;
        color: color-mix(in srgb, var(--report-ink, var(--ink, #162024)) 72%, transparent);
      }

      .reader-search-input {
        flex: 1;
        min-width: 0;
        border: 0;
        outline: none;
        background: transparent;
        color: var(--report-ink, var(--ink, #162024));
        font-size: 20px;
        font-weight: 800;
      }

      .reader-search-close {
        width: 34px;
        height: 34px;
        display: inline-grid;
        place-items: center;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: color-mix(in srgb, var(--report-ink, var(--ink, #162024)) 48%, transparent);
        cursor: pointer;
      }

      .reader-search-close:hover,
      .reader-search-close:focus-visible {
        background: color-mix(in srgb, var(--report-ink, var(--ink, #162024)) 6%, transparent);
        color: var(--report-ink, var(--ink, #162024));
        outline: none;
      }

      .reader-search-close svg {
        width: 18px;
        height: 18px;
      }

      .reader-search-meta {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 14px 24px 6px;
        color: color-mix(in srgb, var(--report-ink, var(--ink, #162024)) 54%, transparent);
        font-size: 14px;
        font-weight: 800;
      }

      .reader-result-list {
        overflow-y: auto;
        padding: 4px 14px 18px;
        scrollbar-width: thin;
      }

      .reader-result {
        width: 100%;
        display: grid;
        grid-template-columns: 28px minmax(0, 1fr) auto;
        gap: 12px;
        align-items: start;
        border: 0;
        border-radius: 14px;
        background: transparent;
        color: var(--report-ink, var(--ink, #162024));
        padding: 12px 14px;
        text-align: left;
        cursor: pointer;
      }

      .reader-result:hover,
      .reader-result:focus-visible,
      .reader-result.is-active {
        background: color-mix(in srgb, var(--report-ink, var(--ink, #162024)) 7%, transparent);
        outline: none;
      }

      .reader-result svg {
        width: 20px;
        height: 20px;
        margin-top: 2px;
        color: color-mix(in srgb, var(--report-ink, var(--ink, #162024)) 54%, transparent);
      }

      .reader-result-title {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        color: var(--report-ink, var(--ink, #162024));
        font-size: 17px;
        font-weight: 900;
        line-height: 1.3;
      }

      .reader-result-path,
      .reader-result-excerpt {
        margin-top: 5px;
        color: color-mix(in srgb, var(--report-ink, var(--ink, #162024)) 48%, transparent);
        font-size: 13px;
        font-weight: 700;
        line-height: 1.5;
      }

      .reader-result-page {
        color: color-mix(in srgb, var(--report-ink, var(--ink, #162024)) 44%, transparent);
        font-family: "Archivo", sans-serif;
        font-size: 12px;
        font-weight: 900;
        white-space: nowrap;
      }

      .reader-empty {
        padding: 28px 20px 38px;
        color: color-mix(in srgb, var(--report-ink, var(--ink, #162024)) 52%, transparent);
        font-size: 15px;
        font-weight: 700;
        text-align: center;
      }

      mark.reader-mark {
        background: rgba(229, 188, 68, .34);
        color: inherit;
        padding: 0 2px;
        border-radius: 3px;
      }

      @media screen and (max-width: 760px) {
        html,
        body {
          max-width: 100%;
          overflow-x: hidden !important;
        }

        body {
          padding: 8px 0 calc(122px + env(safe-area-inset-bottom, 0px)) !important;
        }

        .page,
        .page.cover {
          box-sizing: border-box !important;
          width: calc(100vw - 18px) !important;
          max-width: calc(100vw - 18px) !important;
          min-height: auto !important;
          margin: 0 auto 16px !important;
          padding: 40px 20px 58px !important;
          transform: none !important;
          overflow: hidden !important;
        }

        .page::before,
        .page::after {
          max-width: 100% !important;
        }

        .page > * {
          max-width: 100% !important;
        }

        .rh {
          flex-wrap: wrap !important;
          gap: 6px 12px !important;
          min-width: 0 !important;
          font-size: 9px !important;
          line-height: 1.45 !important;
        }

        h1 {
          max-width: 100% !important;
          font-size: clamp(34px, 12vw, 48px) !important;
          line-height: 1.08 !important;
          overflow-wrap: anywhere !important;
        }

        h2 {
          max-width: 100% !important;
          font-size: clamp(25px, 8vw, 34px) !important;
          line-height: 1.24 !important;
          overflow-wrap: anywhere !important;
        }

        h3,
        p,
        li,
        .lead,
        .subtitle,
        .body,
        .bd,
        .agenda-main,
        .agenda-side,
        .canvas-cell,
        .deliverable,
        .role,
        .tool,
        .cnum,
        .check,
        .prompt,
        .quote,
        .stat {
          min-width: 0 !important;
          overflow-wrap: anywhere !important;
          word-break: normal !important;
        }

        code {
          white-space: normal !important;
          overflow-wrap: anywhere !important;
        }

        img,
        video,
        iframe,
        embed,
        object {
          max-width: 100% !important;
        }

        .video-frame,
        .video-card,
        .cover-main,
        .cover-board,
        .demo-layout,
        .whitepaper-layout,
        .cover-grid,
        .stats,
        .days,
        .metas,
        .cmeta,
        .cnums,
        .proj,
        .oc,
        .qbox,
        .ra,
        .minds,
        .pols,
        .wall,
        .appendix-note,
        .roles,
        .principles,
        .pain-grid,
        .journey,
        .deliverables,
        .quote-grid,
        .source-grid,
        .work-grid,
        .module-grid,
        .source-links,
        .month-panel,
        .phase-ribbon,
        .module-visualizer,
        .prompt-grid,
        .prompt-lab,
        .prompt-meta-row,
        .toc-row,
        .toc-l,
        .toc-sub,
        .sec,
        .agenda-row,
        .canvas-head,
        .canvas-grid,
        .calc-row,
        .flow-row,
        .matrix-row,
        .step {
          grid-template-columns: 1fr !important;
        }

        .flowstrip {
          display: grid !important;
          grid-template-columns: 1fr !important;
        }

        .flow,
        .matrix,
        .canvas,
        .calc-table,
        .agenda,
        table {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
        }

        table {
          display: block !important;
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch;
        }

        .matrix {
          width: 100% !important;
          border-width: 2px !important;
          overflow: hidden !important;
        }

        .matrix-head {
          display: none !important;
        }

        .matrix-row {
          min-height: 0 !important;
          border-bottom: 1px solid var(--line, rgba(22, 32, 36, .16)) !important;
        }

        .matrix-row:last-child {
          border-bottom: 0 !important;
        }

        .matrix-row > div {
          box-sizing: border-box !important;
          min-width: 0 !important;
          width: 100% !important;
          display: block !important;
          padding: 13px 14px !important;
          border-right: 0 !important;
          border-bottom: 1px solid var(--line, rgba(22, 32, 36, .16)) !important;
          font-size: 12px !important;
          line-height: 1.72 !important;
        }

        .matrix-row > div:first-child {
          background: color-mix(in srgb, var(--report-blue, var(--blue, #1d4ed8)) 7%, transparent);
        }

        .matrix-row > div:last-child {
          border-bottom: 0 !important;
        }

        .matrix b {
          display: block !important;
          color: var(--report-ink, var(--ink, #162024)) !important;
        }

        .flow-row,
        .flow-node,
        .agenda-row,
        .calc-row {
          min-width: 0 !important;
        }

        .flow-no {
          width: fit-content !important;
          min-width: 0 !important;
          place-items: start !important;
          justify-content: start !important;
          padding: 14px 0 6px !important;
          border-right: 0 !important;
          font-size: 26px !important;
        }

        .flow-cell,
        .flow-cell:last-child,
        .agenda-main,
        .agenda-side,
        .canvas-cell,
        .calc-row > *,
        .tool,
        .cmeta > div,
        .cnum,
        .check,
        .prompt,
        .stat,
        .role,
        .deliverable,
        .journey-step {
          box-sizing: border-box !important;
          min-width: 0 !important;
          border-right: 0 !important;
        }

        .cmeta > div,
        .cnum {
          border-bottom: 1px solid var(--line, rgba(22, 32, 36, .16)) !important;
        }

        .cmeta > div:last-child,
        .cnum:last-child {
          border-bottom: 0 !important;
        }

        .cnum .cv {
          font-size: clamp(32px, 10vw, 42px) !important;
        }

        .calc-row > * {
          text-align: left !important;
        }

        .tool:nth-child(2n),
        .check:nth-child(2n),
        .prompt:nth-child(2n) {
          padding-left: 0 !important;
        }

        .tool-title-nowrap {
          white-space: normal !important;
        }

        .prompt-side {
          grid-template-columns: 1fr !important;
          border-right: 0 !important;
          border-bottom: 1px solid var(--line, rgba(22, 32, 36, .16)) !important;
        }

        .prompt-tab {
          min-width: 0 !important;
          border-right: 0 !important;
        }

        .prompt-panel-head,
        .prompt-actions {
          width: 100% !important;
        }

        .prompt-editor {
          box-sizing: border-box !important;
          width: 100% !important;
          max-width: 100% !important;
        }

        .report-reader {
          top: calc(10px + env(safe-area-inset-top, 0px)) !important;
          right: 10px !important;
          left: auto !important;
          width: auto !important;
        }

        .reader-button {
          width: 44px !important;
          min-height: 44px !important;
          justify-content: center !important;
          padding: 0 !important;
          border-radius: 10px !important;
          background: color-mix(in srgb, var(--reader-paper) 94%, transparent) !important;
        }

        .reader-button span,
        .reader-list,
        .reader-section-label {
          display: none !important;
        }

        .reader-search-popover {
          top: calc(12px + env(safe-area-inset-top, 0px)) !important;
          width: calc(100vw - 24px) !important;
          max-height: calc(100dvh - 24px - env(safe-area-inset-top, 0px)) !important;
          border-radius: 14px !important;
        }
      }

      @media screen and (max-width: 900px) {
        .report-reader {
          left: 12px;
          top: 12px;
          width: 190px;
        }

        .reader-list {
          display: none;
        }

        .reader-section-label {
          display: none;
        }

        .reader-button {
          width: auto;
          min-height: 40px;
          background: color-mix(in srgb, var(--reader-paper) 90%, transparent);
          border: 1px solid color-mix(in srgb, var(--reader-ink) 12%, transparent);
          box-shadow: 0 8px 22px rgba(22, 32, 36, .12);
        }
      }

      @media screen and (max-width: 560px) {
        .report-reader {
          top: 10px;
          width: auto;
        }

        .reader-button span {
          display: none;
        }

        .reader-search-popover {
          top: 16px;
          width: calc(100vw - 24px);
          max-height: calc(100vh - 32px);
          border-radius: 14px;
        }
      }

      @media screen and (max-width: 760px) {
        .report-reader {
          top: calc(10px + env(safe-area-inset-top, 0px)) !important;
          right: 10px !important;
          left: auto !important;
          width: auto !important;
        }

        .reader-button {
          width: 44px !important;
          min-height: 44px !important;
          justify-content: center !important;
          padding: 0 !important;
          border-radius: 10px !important;
          background: color-mix(in srgb, var(--reader-paper) 94%, transparent) !important;
        }

        .reader-button span,
        .reader-list,
        .reader-section-label {
          display: none !important;
        }

        .reader-search-popover {
          top: calc(12px + env(safe-area-inset-top, 0px)) !important;
          width: calc(100vw - 24px) !important;
          max-height: calc(100dvh - 24px - env(safe-area-inset-top, 0px)) !important;
          border-radius: 14px !important;
        }
      }

      .report-reader.is-reader-compact {
        top: calc(10px + env(safe-area-inset-top, 0px)) !important;
        right: auto !important;
        left: 8px !important;
        width: auto !important;
      }

      .report-reader.is-reader-compact .reader-button {
        width: 44px !important;
        min-height: 44px !important;
        justify-content: center !important;
        padding: 0 !important;
        border: 1px solid color-mix(in srgb, var(--reader-ink) 12%, transparent) !important;
        border-radius: 10px !important;
        background: color-mix(in srgb, var(--reader-paper) 94%, transparent) !important;
        box-shadow: 0 8px 22px rgba(22, 32, 36, .12) !important;
      }

      .report-reader.is-reader-compact .reader-button span,
      .report-reader.is-reader-compact .reader-list,
      .report-reader.is-reader-compact .reader-section-label {
        display: none !important;
      }

      .report-reader.is-reader-hidden {
        display: none !important;
      }

      @media print {
        .report-reader,
        .reader-search-popover,
        .reader-progress {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function cleanText(value = '') {
    return value.replace(/\s+/g, ' ').trim();
  }

  function ensureId(element, prefix, index) {
    if (element.id) return element.id;
    element.id = `${prefix}-${index + 1}`;
    return element.id;
  }

  function titleForPage(page, index) {
    const heading = page.querySelector('h2, h1, h3');
    const pgn = cleanText(page.querySelector('.pgn')?.textContent || String(index + 1).padStart(2, '0'));
    return {
      title: cleanText(heading?.textContent || `第 ${pgn} 頁`),
      page: pgn
    };
  }

  function itemsFromPrintedToc() {
    return [...document.querySelectorAll('#toc .toc-sub')]
      .map((link) => {
        const href = link.getAttribute('href') || '';
        const id = href.startsWith('#') ? href.slice(1) : '';
        const target = id ? document.getElementById(id) : null;
        if (!target) return null;

        const titleNode = link.querySelector('.ts-t');
        const title = cleanText(titleNode?.textContent || (() => {
          const clone = link.cloneNode(true);
          clone.querySelectorAll('.ts-c, .ts-p').forEach((node) => node.remove());
          return clone.textContent;
        })());
        const code = cleanText(link.querySelector('.ts-c')?.textContent || '').replace(/\s*\/\s*$/, '');
        const page = cleanText(link.querySelector('.ts-p')?.textContent || target.querySelector('.pgn')?.textContent);
        const body = cleanText(target.querySelector('.lead, .bd, p')?.textContent || '');

        return {
          id,
          title,
          code,
          page,
          body,
          search: `${title} ${code} ${page} ${body}`.toLowerCase()
        };
      })
      .filter(Boolean);
  }

  function itemsFromPages() {
    return [...document.querySelectorAll('.page')]
      .filter((page) => page.id !== 'toc' && !page.classList.contains('cover'))
      .map((page, index) => {
        const { title, page: pageNumber } = titleForPage(page, index);
        const body = cleanText(page.querySelector('.lead, .body, .bd, p')?.textContent || '');
        return {
          id: ensureId(page, 'report-section', index),
          title,
          code: '',
          page: pageNumber,
          body,
          search: `${title} ${pageNumber} ${body}`.toLowerCase()
        };
      });
  }

  function collectItems() {
    const tocItems = itemsFromPrintedToc();
    const source = tocItems.length ? tocItems : itemsFromPages();
    const seen = new Set();
    return source.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function highlight(value, query) {
    const escaped = escapeHtml(value);
    if (!query) return escaped;
    const terms = query.split(/\s+/).filter(Boolean).map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!terms.length) return escaped;
    return escaped.replace(new RegExp(`(${terms.join('|')})`, 'gi'), '<mark class="reader-mark">$1</mark>');
  }

  function scrollToItem(item) {
    const target = document.getElementById(item.id);
    if (!target) return;
    closeSearch();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', `#${item.id}`);
  }

  let items = [];
  let activeId = '';
  let searchElement = null;
  let searchInput = null;
  let resultList = null;
  let resultCount = null;
  let currentResults = [];
  let activeResultIndex = 0;
  let readerLayoutFrame = 0;
  const readerCompactClass = 'is-reader-compact';
  const readerHiddenClass = 'is-reader-hidden';

  function rectsOverlap(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  function readerOverlapsPage(nav) {
    const readerRect = nav.getBoundingClientRect();
    if (!readerRect.width || !readerRect.height) return false;
    return [...document.querySelectorAll('.page')]
      .some((page) => rectsOverlap(readerRect, page.getBoundingClientRect()));
  }

  function updateReaderCollisionMode() {
    const nav = document.getElementById(tocId);
    if (!nav) return;

    nav.classList.remove(readerCompactClass, readerHiddenClass);
    if (!readerOverlapsPage(nav)) return;

    nav.classList.add(readerCompactClass);
    if (readerOverlapsPage(nav)) {
      nav.classList.add(readerHiddenClass);
    }
  }

  function scheduleReaderCollisionCheck() {
    if (readerLayoutFrame) cancelAnimationFrame(readerLayoutFrame);
    readerLayoutFrame = requestAnimationFrame(() => {
      readerLayoutFrame = 0;
      updateReaderCollisionMode();
    });
  }

  function createSidebar() {
    if (document.getElementById(tocId) || !items.length) return;

    const nav = document.createElement('nav');
    nav.id = tocId;
    nav.className = 'report-reader';
    nav.setAttribute('aria-label', '報告瀏覽目錄');
    nav.innerHTML = `
      <div class="reader-panel">
        <button class="reader-button" type="button" data-open-reader-search>
          ${icons.search}
          <span>搜尋</span>
        </button>
        <div class="reader-section-label">
          ${icons.section}
          <span>目錄</span>
        </div>
        <div class="reader-list">
          ${items.map((item) => `
            <a class="reader-link" href="#${escapeHtml(item.id)}" data-reader-id="${escapeHtml(item.id)}">
              <span>${escapeHtml(item.title)}</span>
              ${item.page ? `<b class="reader-page">${escapeHtml(item.page)}</b>` : ''}
            </a>
          `).join('')}
        </div>
      </div>
    `;

    nav.querySelector('[data-open-reader-search]').addEventListener('click', openSearch);
    nav.querySelectorAll('.reader-link').forEach((link) => {
      link.addEventListener('click', (event) => {
        const item = items.find((entry) => entry.id === link.dataset.readerId);
        if (!item) return;
        event.preventDefault();
        scrollToItem(item);
      });
    });

    document.body.appendChild(nav);
    scheduleReaderCollisionCheck();
  }

  function createProgress() {
    if (document.getElementById(progressId)) return;
    const progress = document.createElement('div');
    progress.id = progressId;
    progress.className = 'reader-progress';
    progress.setAttribute('aria-hidden', 'true');
    progress.innerHTML = '<div class="reader-progress-bar"></div>';
    document.body.appendChild(progress);
  }

  function createSearch() {
    if (document.getElementById(searchId)) return;

    searchElement = document.createElement('section');
    searchElement.id = searchId;
    searchElement.className = 'reader-search-popover';
    searchElement.setAttribute('aria-label', '搜尋報告章節');
    searchElement.setAttribute('aria-hidden', 'true');
    searchElement.innerHTML = `
      <div class="reader-search-head">
        ${icons.search}
        <input class="reader-search-input" type="text" placeholder="搜尋章節、頁碼或關鍵字" autocomplete="off">
        <button class="reader-search-close" type="button" aria-label="關閉搜尋">${icons.close}</button>
      </div>
      <div class="reader-search-meta">
        <span class="reader-result-count"></span>
        <span>最佳結果</span>
      </div>
      <div class="reader-result-list" role="listbox"></div>
    `;

    searchInput = searchElement.querySelector('.reader-search-input');
    resultList = searchElement.querySelector('.reader-result-list');
    resultCount = searchElement.querySelector('.reader-result-count');
    searchElement.querySelector('.reader-search-close').addEventListener('click', closeSearch);
    searchInput.addEventListener('input', () => renderResults(searchInput.value));
    searchInput.addEventListener('keydown', handleSearchKeys);
    resultList.addEventListener('click', (event) => {
      const button = event.target.closest('[data-result-index]');
      if (!button) return;
      const item = currentResults[Number(button.dataset.resultIndex)];
      if (item) scrollToItem(item);
    });

    document.body.appendChild(searchElement);
    renderResults('');
  }

  function openSearch() {
    if (!searchElement) createSearch();
    searchElement.classList.add('is-open');
    searchElement.setAttribute('aria-hidden', 'false');
    searchInput.value = '';
    renderResults('');
    requestAnimationFrame(() => searchInput.focus());
  }

  function closeSearch() {
    if (!searchElement) return;
    searchElement.classList.remove('is-open');
    searchElement.setAttribute('aria-hidden', 'true');
  }

  function filteredResults(query) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;

    const terms = normalized.split(/\s+/).filter(Boolean);
    return items
      .map((item) => {
        const score = terms.reduce((total, term) => {
          if (item.title.toLowerCase().includes(term)) return total + 4;
          if (item.code.toLowerCase().includes(term) || item.page.toLowerCase().includes(term)) return total + 3;
          if (item.search.includes(term)) return total + 1;
          return total;
        }, 0);
        return { item, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || items.indexOf(a.item) - items.indexOf(b.item))
      .map(({ item }) => item);
  }

  function renderResults(query) {
    currentResults = filteredResults(query);
    activeResultIndex = 0;
    resultCount.textContent = `搜尋結果（${currentResults.length}）`;

    if (!currentResults.length) {
      resultList.innerHTML = '<div class="reader-empty">找不到符合的章節</div>';
      return;
    }

    resultList.innerHTML = currentResults.map((item, index) => `
      <button class="reader-result${index === activeResultIndex ? ' is-active' : ''}" type="button" data-result-index="${index}" role="option" aria-selected="${index === activeResultIndex}">
        ${icons.page}
        <span>
          <span class="reader-result-title">${highlight(item.title, query)}</span>
          <span class="reader-result-path">${escapeHtml([item.code, item.page ? `第 ${item.page} 頁` : ''].filter(Boolean).join(' ・ '))}</span>
          ${item.body ? `<span class="reader-result-excerpt">${highlight(item.body.slice(0, 86), query)}</span>` : ''}
        </span>
        <span class="reader-result-page">${escapeHtml(item.page || '')}</span>
      </button>
    `).join('');
  }

  function setActiveResult(index) {
    if (!currentResults.length) return;
    activeResultIndex = (index + currentResults.length) % currentResults.length;
    resultList.querySelectorAll('.reader-result').forEach((button, buttonIndex) => {
      const active = buttonIndex === activeResultIndex;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
      if (active) button.scrollIntoView({ block: 'nearest' });
    });
  }

  function handleSearchKeys(event) {
    if (event.key === 'Escape') {
      closeSearch();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveResult(activeResultIndex + 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveResult(activeResultIndex - 1);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const item = currentResults[activeResultIndex];
      if (item) scrollToItem(item);
    }
  }

  function observeActiveSection() {
    const links = [...document.querySelectorAll('.reader-link')];
    if (!('IntersectionObserver' in window) || !links.length) return;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible?.target?.id) return;

      activeId = visible.target.id;
      links.forEach((link) => link.classList.toggle('is-active', link.dataset.readerId === activeId));
    }, {
      rootMargin: '-18% 0px -70% 0px',
      threshold: [0, .2, .6]
    });

    items.forEach((item) => {
      const target = document.getElementById(item.id);
      if (target) observer.observe(target);
    });
  }

  function bindKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      const target = event.target;
      const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openSearch();
        return;
      }

      if (!isTyping && event.key === '/') {
        event.preventDefault();
        openSearch();
        return;
      }

      if (event.key === 'Escape' && searchElement?.classList.contains('is-open')) {
        closeSearch();
      }
    });
  }

  function init() {
    injectStyle();
    applyVisitorLock(reportAccessState());

    items = collectItems();
    if (!items.length) return;
    createProgress();
    createSidebar();
    createSearch();
    observeActiveSection();
    bindKeyboardShortcuts();
    window.addEventListener('resize', scheduleReaderCollisionCheck, { passive: true });
    window.addEventListener('orientationchange', scheduleReaderCollisionCheck, { passive: true });
    window.addEventListener('load', scheduleReaderCollisionCheck, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
