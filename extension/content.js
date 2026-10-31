'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  json-humanized · Content Script
//  Auto-detects JSON pages and provides floating reader & selection overlay
// ─────────────────────────────────────────────────────────────────────────────

(() => {
  if (window.__JH_CONTENT_INITIALIZED__) return;
  window.__JH_CONTENT_INITIALIZED__ = true;

  const ICON_SVG = `<svg width="20" height="20" viewBox="0 0 128 128" fill="none" style="vertical-align:middle;">
    <circle cx="48" cy="44" r="19" fill="#ffffff"/>
    <path d="M 40 60 L 56 60 L 56 72 Q 74 76 76 96 L 20 96 Q 22 76 40 72 Z" fill="#ffffff"/>
    <path d="M 72 38 A 16 16 0 0 1 72 58" stroke="#00e5ff" stroke-width="6" stroke-linecap="round"/>
    <path d="M 84 30 A 28 28 0 0 1 84 66" stroke="#00e5ff" stroke-width="6" stroke-linecap="round"/>
    <path d="M 96 22 A 40 40 0 0 1 96 74" stroke="#00e5ff" stroke-width="6" stroke-linecap="round"/>
  </svg>`;

  // Listen for messages from background script (Context Menu)
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'HUMANIZE_SELECTION' && msg.text) {
      showHumanizedModal(msg.text);
      sendResponse({ status: 'ok' });
    }
  });

  // Check if current page is raw JSON
  checkAndInjectRawJsonBadge();

  function checkAndInjectRawJsonBadge() {
    const isJsonMime = document.contentType === 'application/json';
    const isSimplePage = document.body && document.body.children.length <= 2;
    const pre = document.querySelector('pre');

    if (!isJsonMime && !isSimplePage) return;

    const raw = (pre ? pre.innerText : document.body.innerText).trim();
    if (!raw.startsWith('{') && !raw.startsWith('[')) return;

    try {
      const data = JSON.parse(raw);
      injectFloatingBadge(data);
    } catch {
      // Not valid JSON
    }
  }

  function injectFloatingBadge(parsedData) {
    if (document.getElementById('jh-floating-badge')) return;

    const isRu = (navigator.language || '').toLowerCase().startsWith('ru');
    const badgeText = isRu ? 'Очеловечить JSON' : 'Humanize JSON';

    const badge = document.createElement('div');
    badge.id = 'jh-floating-badge';
    badge.innerHTML = `
      <style>
        #jh-floating-badge {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 99999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        #jh-floating-btn {
          background: #0d0e16;
          color: #ffffff;
          border: 1.5px solid #00e5ff;
          font-weight: 700;
          font-size: 13px;
          padding: 8px 16px;
          border-radius: 99px;
          box-shadow: 0 4px 20px rgba(0, 229, 255, 0.45);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
        }
        #jh-floating-btn:hover {
          transform: translateY(-2px);
          background: #141624;
          box-shadow: 0 6px 26px rgba(0, 229, 255, 0.65);
        }
      </style>
      <button id="jh-floating-btn">${ICON_SVG} <span>${badgeText}</span></button>
    `;

    document.body.appendChild(badge);

    document.getElementById('jh-floating-btn').addEventListener('click', () => {
      showHumanizedModal(parsedData);
    });
  }

  function showHumanizedModal(input) {
    let data;
    if (typeof input === 'string') {
      try {
        data = JSON.parse(input);
      } catch (e) {
        alert('Invalid JSON selected: ' + e.message);
        return;
      }
    } else {
      data = input;
    }

    let existingModal = document.getElementById('jh-modal-container');
    if (existingModal) existingModal.remove();

    let currentModalLang = (navigator.language || '').toLowerCase().startsWith('ru') ? 'ru' : 'en';
    let isSpeaking = false;

    function renderContent() {
      if (typeof humanizeEngine === 'function') {
        return humanizeEngine(data, 'json', 'plain', 'structured', currentModalLang);
      }
      return JSON.stringify(data, null, 2);
    }

    const modal = document.createElement('div');
    modal.id = 'jh-modal-container';
    modal.innerHTML = `
      <style>
        #jh-modal-container {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(8, 9, 14, 0.82);
          backdrop-filter: blur(8px);
          z-index: 100000000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          animation: jhFadeIn 0.2s ease-out;
        }
        @keyframes jhFadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .jh-modal-box {
          background: #12131d;
          border: 1px solid #28293d;
          border-radius: 14px;
          width: 600px;
          max-width: 92vw;
          max-height: 86vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.7);
          overflow: hidden;
          color: #eaeaf5;
        }
        .jh-modal-header {
          padding: 14px 20px;
          border-bottom: 1px solid #232436;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #171826;
        }
        .jh-modal-title {
          font-weight: 800;
          font-size: 15px;
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .jh-modal-title span { color: #00e5ff; }
        .jh-modal-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .jh-lang-btn {
          background: #232436;
          border: 1px solid #35364e;
          color: #cfd0e8;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 11px;
          cursor: pointer;
        }
        .jh-modal-close {
          background: transparent;
          border: none;
          color: #8888aa;
          font-size: 22px;
          cursor: pointer;
          line-height: 1;
          padding: 0 4px;
        }
        .jh-modal-close:hover { color: #ffffff; }
        .jh-modal-body {
          padding: 18px 22px;
          overflow-y: auto;
          font-family: 'SF Mono', Consolas, Monaco, monospace;
          font-size: 13px;
          line-height: 1.7;
          white-space: pre-wrap;
          color: #d8d9f0;
          flex: 1;
        }
        .jh-modal-footer {
          padding: 12px 20px;
          border-top: 1px solid #232436;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #151624;
        }
        .jh-btn {
          background: #232436;
          border: 1px solid #35364e;
          color: #e0e0f0;
          padding: 7px 14px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.15s;
        }
        .jh-btn:hover { background: #35364e; }
        .jh-btn-primary {
          background: #00e5ff;
          color: #000;
          border-color: #00e5ff;
        }
        .jh-btn-primary:hover { opacity: 0.92; }
      </style>
      <div class="jh-modal-box">
        <div class="jh-modal-header">
          <div class="jh-modal-title">
            ${ICON_SVG}
            <span>json-<span>humanized</span></span>
          </div>
          <div class="jh-modal-controls">
            <button class="jh-lang-btn" id="jh-modal-lang-toggle">${currentModalLang === 'ru' ? '🇷🇺 RU' : '🇬🇧 EN'}</button>
            <button class="jh-modal-close" id="jh-close-btn">&times;</button>
          </div>
        </div>
        <div class="jh-modal-body" id="jh-body-text">${escapeHtml(renderContent())}</div>
        <div class="jh-modal-footer">
          <div style="display:flex; gap:8px;">
            <button class="jh-btn" id="jh-speak-btn">🔊 ${currentModalLang === 'ru' ? 'Слушать' : 'Listen'}</button>
            <button class="jh-btn" id="jh-copy-btn">📋 ${currentModalLang === 'ru' ? 'Копировать' : 'Copy'}</button>
          </div>
          <button class="jh-btn jh-btn-primary" id="jh-done-btn">${currentModalLang === 'ru' ? 'Закрыть' : 'Done'}</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const updateTexts = () => {
      document.getElementById('jh-body-text').innerHTML = escapeHtml(renderContent());
      document.getElementById('jh-modal-lang-toggle').textContent = currentModalLang === 'ru' ? '🇷🇺 RU' : '🇬🇧 EN';
      document.getElementById('jh-speak-btn').textContent = `🔊 ${currentModalLang === 'ru' ? 'Слушать' : 'Listen'}`;
      document.getElementById('jh-copy-btn').textContent = `📋 ${currentModalLang === 'ru' ? 'Копировать' : 'Copy'}`;
      document.getElementById('jh-done-btn').textContent = currentModalLang === 'ru' ? 'Закрыть' : 'Done';
    };

    document.getElementById('jh-modal-lang-toggle').addEventListener('click', () => {
      currentModalLang = currentModalLang === 'ru' ? 'en' : 'ru';
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      isSpeaking = false;
      updateTexts();
    });

    document.getElementById('jh-close-btn').addEventListener('click', () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      modal.remove();
    });
    document.getElementById('jh-done-btn').addEventListener('click', () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      modal.remove();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        modal.remove();
      }
    });

    document.getElementById('jh-copy-btn').addEventListener('click', () => {
      const text = document.getElementById('jh-body-text').innerText;
      navigator.clipboard.writeText(text);
      const btn = document.getElementById('jh-copy-btn');
      btn.textContent = currentModalLang === 'ru' ? '✓ Скопировано' : '✓ Copied';
      setTimeout(() => {
        btn.textContent = `📋 ${currentModalLang === 'ru' ? 'Копировать' : 'Copy'}`;
      }, 1500);
    });

    document.getElementById('jh-speak-btn').addEventListener('click', () => {
      if (!('speechSynthesis' in window)) {
        alert('Speech synthesis is not supported in this browser.');
        return;
      }
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        document.getElementById('jh-speak-btn').textContent = `🔊 ${currentModalLang === 'ru' ? 'Слушать' : 'Listen'}`;
        return;
      }
      window.speechSynthesis.cancel();
      const text = document.getElementById('jh-body-text').innerText;
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = currentModalLang === 'ru' ? 'ru-RU' : 'en-US';
      utt.onstart = () => {
        isSpeaking = true;
        document.getElementById('jh-speak-btn').textContent = `⏹ ${currentModalLang === 'ru' ? 'Стоп' : 'Stop'}`;
      };
      utt.onend = utt.onerror = () => {
        isSpeaking = false;
        document.getElementById('jh-speak-btn').textContent = `🔊 ${currentModalLang === 'ru' ? 'Слушать' : 'Listen'}`;
      };
      window.speechSynthesis.speak(utt);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
