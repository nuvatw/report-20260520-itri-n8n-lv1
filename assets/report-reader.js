(() => {
  const styleId = 'nuva-report-reader-style';
  const tocId = 'nuva-report-reader';
  const searchId = 'nuva-report-search';

  const icons = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    section: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 6h16"/><path d="M4 12h12"/><path d="M4 18h8"/></svg>',
    page: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'
  };

  function injectStyle() {
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .report-reader {
        position: fixed;
        left: max(18px, calc((100vw - 1180px) / 2 - 138px));
        top: 92px;
        z-index: 900;
        width: 214px;
        max-height: calc(100vh - 150px);
        overflow: hidden;
        color: var(--ink, #162024);
        font-family: "Noto Sans TC", sans-serif;
      }

      .reader-panel {
        display: grid;
        gap: 8px;
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
        color: rgba(22, 32, 36, .58);
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
        background: rgba(255, 255, 255, .64);
        color: var(--ink, #162024);
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
        color: var(--ink, #162024);
        font-size: 14px;
        font-weight: 900;
      }

      .reader-section-label svg {
        width: 18px;
        height: 18px;
        color: var(--blue, #1d4ed8);
      }

      .reader-list {
        max-height: min(58vh, 560px);
        overflow-y: auto;
        margin-left: 19px;
        padding: 4px 0 6px 14px;
        border-left: 1px solid rgba(22, 32, 36, .16);
        scrollbar-width: thin;
      }

      .reader-link {
        min-height: 32px;
        padding: 0 8px;
        color: rgba(22, 32, 36, .42);
        font-size: 13px;
        font-weight: 700;
      }

      .reader-link span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .reader-page {
        margin-left: auto;
        color: rgba(22, 32, 36, .34);
        font-family: "Archivo", sans-serif;
        font-size: 11px;
        font-weight: 800;
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
        border: 1px solid rgba(22, 32, 36, .08);
        border-radius: 18px;
        background: rgba(255, 255, 255, .98);
        box-shadow: 0 28px 70px rgba(22, 32, 36, .24);
        color: var(--ink, #162024);
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
        border-bottom: 1px solid rgba(22, 32, 36, .08);
      }

      .reader-search-head svg {
        width: 22px;
        height: 22px;
        color: rgba(22, 32, 36, .72);
      }

      .reader-search-input {
        flex: 1;
        min-width: 0;
        border: 0;
        outline: none;
        background: transparent;
        color: var(--ink, #162024);
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
        color: rgba(22, 32, 36, .48);
        cursor: pointer;
      }

      .reader-search-close:hover,
      .reader-search-close:focus-visible {
        background: rgba(22, 32, 36, .06);
        color: var(--ink, #162024);
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
        color: rgba(22, 32, 36, .54);
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
        color: var(--ink, #162024);
        padding: 12px 14px;
        text-align: left;
        cursor: pointer;
      }

      .reader-result:hover,
      .reader-result:focus-visible,
      .reader-result.is-active {
        background: rgba(22, 32, 36, .07);
        outline: none;
      }

      .reader-result svg {
        width: 20px;
        height: 20px;
        margin-top: 2px;
        color: rgba(22, 32, 36, .54);
      }

      .reader-result-title {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        color: var(--ink, #162024);
        font-size: 17px;
        font-weight: 900;
        line-height: 1.3;
      }

      .reader-result-path,
      .reader-result-excerpt {
        margin-top: 5px;
        color: rgba(22, 32, 36, .48);
        font-size: 13px;
        font-weight: 700;
        line-height: 1.5;
      }

      .reader-result-page {
        color: rgba(22, 32, 36, .44);
        font-family: "Archivo", sans-serif;
        font-size: 12px;
        font-weight: 900;
        white-space: nowrap;
      }

      .reader-empty {
        padding: 28px 20px 38px;
        color: rgba(22, 32, 36, .52);
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

      @media screen and (max-width: 1180px) {
        .report-reader {
          left: 12px;
          top: 12px;
          width: 190px;
          max-height: calc(100vh - 110px);
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
          background: rgba(255, 255, 255, .9);
          border: 1px solid rgba(22, 32, 36, .12);
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

      @media print {
        .report-reader,
        .reader-search-popover {
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

        const title = cleanText(link.querySelector('.ts-t')?.textContent || link.textContent);
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
    return [...document.querySelectorAll('.page[id]')]
      .filter((page) => page.id !== 'toc')
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
          <span>Search</span>
        </button>
        <div class="reader-section-label">
          ${icons.section}
          <span>Contents</span>
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
        <span>Best matches</span>
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
    resultCount.textContent = `Search results (${currentResults.length})`;

    if (!currentResults.length) {
      resultList.innerHTML = '<div class="reader-empty">找不到符合的章節</div>';
      return;
    }

    resultList.innerHTML = currentResults.map((item, index) => `
      <button class="reader-result${index === activeResultIndex ? ' is-active' : ''}" type="button" data-result-index="${index}" role="option" aria-selected="${index === activeResultIndex}">
        ${icons.page}
        <span>
          <span class="reader-result-title">${highlight(item.title, query)}</span>
          <span class="reader-result-path">${escapeHtml([item.code, item.page ? `Page ${item.page}` : ''].filter(Boolean).join(' ・ '))}</span>
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
    items = collectItems();
    if (!items.length) return;
    injectStyle();
    createSidebar();
    createSearch();
    observeActiveSection();
    bindKeyboardShortcuts();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
