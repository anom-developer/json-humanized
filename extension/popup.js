'use strict';

// ── Localized UI dictionary ──────────────────────────────────────────────────
const UI_TEXTS = {
  en: {
    subtitle: '🗣️ Human language for data',
    pageBtn: 'Page',
    detected: 'Found JSON on active tab!',
    importBtn: 'Import',
    tabHum: '📝 Humanize',
    tabDiff: '🔀 Diff',
    tabSet: '⚙️ Settings',
    samples: 'Sample:',
    sUser: 'user',
    sApi: 'api',
    sErr: 'error',
    inputPh: 'Paste JSON / YAML / TOML or drop a file here...',
    btnRun: 'Humanize →',
    resLbl: 'Result',
    btnSpeak: 'Listen',
    btnSpeaking: 'Stop',
    btnCopy: 'Copy',
    btnSave: 'Save',
    outPlaceholder: 'Humanized prose will appear here...',
    diffA: 'Original (Before)',
    diffB: 'Updated (After)',
    diffRun: 'Compare Differences →',
    diffPlaceholder: 'Changes summary will appear here...',
    setEng: 'Engine',
    setKeyNote: 'Stored securely in your local browser storage.',
    setLang: 'Default Output Language',
    btnSaveSet: 'Save Settings',
    setSaved: '✓ Settings saved successfully!',
    emptyWarn: '⚠ Please paste some input first',
    parseErr: '✖ Parse error: ',
    copied: '✓ Copied',
    diffHint: 'Drag & drop files or paste:',
    diffSample: 'Sample diff',
    prettifyTitle: 'Format / Prettify (2 spaces)',
    clearTitle: 'Clear input',
  },
  ru: {
    subtitle: '🗣️ Понятный язык для данных',
    pageBtn: 'Вкладка',
    detected: 'Обнаружен JSON на открытой странице!',
    importBtn: 'Вставить',
    tabHum: '📝 Очеловечить',
    tabDiff: '🔀 Сравнение',
    tabSet: '⚙️ Настройки',
    samples: 'Примеры:',
    sUser: 'пользователь',
    sApi: 'ответ API',
    sErr: 'ошибка',
    inputPh: 'Вставьте JSON / YAML / TOML или перетащите файл сюда...',
    btnRun: 'Очеловечить →',
    resLbl: 'Результат',
    btnSpeak: 'Слушать',
    btnSpeaking: 'Стоп',
    btnCopy: 'Копировать',
    btnSave: 'Скачать',
    outPlaceholder: 'Здесь появится понятный текст на человеческом языке...',
    diffA: 'До (Оригинал)',
    diffB: 'После (Обновленный)',
    diffRun: 'Сравнить различия →',
    diffPlaceholder: 'Сводка различий появится здесь...',
    diffHint: 'Перетащите файлы или вставьте:',
    diffSample: 'Пример различий',
    prettifyTitle: 'Форматировать (отступы 2 пробела)',
    clearTitle: 'Очистить поле',
    setEng: 'Движок обработки',
    setKeyNote: 'Хранится локально в вашем браузере, безопасно.',
    setLang: 'Язык вывода по умолчанию',
    btnSaveSet: 'Сохранить настройки',
    setSaved: '✓ Настройки успешно сохранены!',
    emptyWarn: '⚠ Вставьте данные JSON, YAML или TOML',
    parseErr: '✖ Ошибка структуры: ',
    copied: '✓ Скопировано',
  }
};

// ── Samples ──────────────────────────────────────────────────────────────────
const SAMPLES = {
  user: `{
  "id": "usr_8f3k2",
  "name": "Alice Johnson",
  "email": "alice@example.com",
  "age": 28,
  "password": "hunter2",
  "balance": 4250.75,
  "created_at": "2024-03-15T10:30:00Z",
  "last_login": "2024-06-28T14:22:00Z",
  "is_active": true,
  "address": { "city": "San Francisco", "country": "US" },
  "tags": ["premium", "early-adopter"]
}`,
  api: `{
  "data": {
    "courses": [
      { "id": 101, "title": "Intro to AI", "rating": 9.2 },
      { "id": 102, "title": "Modern JavaScript", "rating": 8.8 }
    ],
    "total": 42
  },
  "meta": { "page": 1, "per_page": 2, "took_ms": 34 }
}`,
  error: `{
  "error": {
    "code": 403,
    "message": "Access denied",
    "details": "Insufficient permissions to view billing details"
  },
  "timestamp": "2024-08-10T12:00:00Z"
}`
};

// ── State ────────────────────────────────────────────────────────────────────
let currentFmt = 'json';
let currentLang = 'en';
let config = {
  engine: 'local',
  apiKey: '',
  defaultLang: 'en'
};
let isSpeaking = false;
let detectedPageJson = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Load stored settings
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const stored = await chrome.storage.local.get(['jh_engine', 'jh_api_key', 'jh_lang']);
    if (stored.jh_engine) config.engine = stored.jh_engine;
    if (stored.jh_api_key) config.apiKey = stored.jh_api_key;
    if (stored.jh_lang) {
      config.defaultLang = stored.jh_lang;
      currentLang = stored.jh_lang;
    } else {
      // Default from browser locale
      if (navigator.language && navigator.language.startsWith('ru')) {
        currentLang = 'ru';
        config.defaultLang = 'ru';
      }
    }
  }

  // Set initial language in dropdown
  document.getElementById('lang-select').value = currentLang;
  applyLocalization(currentLang);

  // Init UI elements
  document.getElementById('cfg-engine').value = config.engine;
  document.getElementById('cfg-api-key').value = config.apiKey;
  document.getElementById('cfg-lang').value = config.defaultLang === 'ru' ? 'Russian' : 'English';
  updateApiKeyVisibility();

  // Load default sample
  document.getElementById('input-text').value = SAMPLES.user;

  // Bind Events
  setupTabs();
  setupFormats();
  setupSamples();
  setupDragAndDrop();
  setupActions();
  setupSettings();
  setupActiveTabDetector();
});

function applyLocalization(lang) {
  const t = UI_TEXTS[lang] || UI_TEXTS.en;

  document.getElementById('hdr-sub').textContent = t.subtitle;
  document.getElementById('lbl-page-btn').textContent = t.pageBtn;
  document.getElementById('lbl-detected').textContent = t.detected;
  document.getElementById('btn-load-detected').textContent = t.importBtn;

  document.getElementById('nav-hum').textContent = t.tabHum;
  document.getElementById('nav-diff').textContent = t.tabDiff;
  document.getElementById('nav-set').textContent = t.tabSet;

  document.getElementById('lbl-samples').textContent = t.samples;
  document.getElementById('s-user').textContent = t.sUser;
  document.getElementById('s-api').textContent = t.sApi;
  document.getElementById('s-err').textContent = t.sErr;

  document.getElementById('input-text').placeholder = t.inputPh;
  document.getElementById('btn-run').textContent = t.btnRun;

  document.getElementById('lbl-res').textContent = t.resLbl;
  document.getElementById('lbl-speak').textContent = isSpeaking ? t.btnSpeaking : t.btnSpeak;
  document.getElementById('lbl-copy').textContent = t.btnCopy;
  document.getElementById('lbl-save').textContent = t.btnSave;

  const out = document.getElementById('output-text');
  if (out.classList.contains('placeholder')) {
    out.textContent = t.outPlaceholder;
  }

  document.getElementById('lbl-diff-a').textContent = t.diffA;
  document.getElementById('lbl-diff-b').textContent = t.diffB;
  document.getElementById('btn-diff-run').textContent = t.diffRun;
  if (document.getElementById('lbl-diff-hint')) {
    document.getElementById('lbl-diff-hint').textContent = t.diffHint;
  }
  if (document.getElementById('lbl-diff-sample')) {
    document.getElementById('lbl-diff-sample').textContent = t.diffSample;
  }
  if (document.getElementById('btn-prettify')) {
    document.getElementById('btn-prettify').title = t.prettifyTitle;
  }
  if (document.getElementById('btn-clear')) {
    document.getElementById('btn-clear').title = t.clearTitle;
  }

  const diffOut = document.getElementById('diff-output');
  if (diffOut.classList.contains('placeholder')) {
    diffOut.textContent = t.diffPlaceholder;
  }

  document.getElementById('lbl-set-eng').textContent = t.setEng;
  document.getElementById('lbl-set-key-note').textContent = t.setKeyNote;
  document.getElementById('lbl-set-lang').textContent = t.setLang;
  document.getElementById('btn-save-settings').textContent = t.btnSaveSet;
}

function updateApiKeyVisibility() {
  const engine = document.getElementById('cfg-engine').value;
  const keyGroup = document.getElementById('group-api-key');
  keyGroup.style.display = (engine === 'openai' || engine === 'anthropic') ? 'flex' : 'none';
}

function setupTabs() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const target = document.getElementById(`tab-${tab.dataset.tab}`);
      if (target) target.classList.add('active');
    });
  });
}

function setupFormats() {
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFmt = chip.dataset.fmt;
    });
  });

  document.getElementById('lang-select').addEventListener('change', (e) => {
    currentLang = e.target.value;
    applyLocalization(currentLang);
    // If output exists, re-run humanize automatically to update language
    const raw = document.getElementById('input-text').value.trim();
    const out = document.getElementById('output-text');
    if (raw && !out.classList.contains('placeholder')) {
      document.getElementById('btn-run').click();
    }
  });
}

function setupSamples() {
  document.querySelectorAll('.sample-btn[data-sample]').forEach(btn => {
    btn.addEventListener('click', () => {
      const sample = SAMPLES[btn.dataset.sample];
      if (sample) {
        document.getElementById('input-text').value = sample;
        selectChip('json');
      }
    });
  });

  // Prettify button
  const prettifyBtn = document.getElementById('btn-prettify');
  if (prettifyBtn) {
    prettifyBtn.addEventListener('click', () => {
      const textarea = document.getElementById('input-text');
      const raw = textarea.value.trim();
      if (!raw) return;
      try {
        const parsed = parseBrowserData(raw, currentFmt);
        if ((currentFmt === 'yaml' || currentFmt === 'yml') && typeof jsyaml !== 'undefined') {
          textarea.value = jsyaml.dump(parsed, { indent: 2 });
        } else {
          textarea.value = JSON.stringify(parsed, null, 2);
        }
      } catch (err) {
        // Visual cue of error
        textarea.style.borderColor = 'var(--red, #ff6b6b)';
        setTimeout(() => { textarea.style.borderColor = ''; }, 1000);
      }
    });
  }

  // Clear button
  const clearBtn = document.getElementById('btn-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      document.getElementById('input-text').value = '';
      const out = document.getElementById('output-text');
      out.className = 'output-pane placeholder';
      out.textContent = UI_TEXTS[currentLang].outPlaceholder;
      const statsEl = document.getElementById('popup-stats');
      if (statsEl) statsEl.style.display = 'none';
    });
  }

  // Diff sample button
  const diffSampleBtn = document.getElementById('btn-diff-sample');
  if (diffSampleBtn) {
    diffSampleBtn.addEventListener('click', () => {
      document.getElementById('diff-a').value = JSON.stringify({
        user: "Alice Johnson",
        plan: "standard",
        quota: 1000,
        features: ["chat", "export"]
      }, null, 2);

      document.getElementById('diff-b').value = JSON.stringify({
        user: "Alice Johnson",
        plan: "pro",
        quota: 50000,
        features: ["chat", "export", "teamwork"],
        verified: true
      }, null, 2);

      document.getElementById('btn-diff-run').click();
    });
  }
}

function bindDropZone(targetEl, onContent, onExtension) {
  if (!targetEl) return;
  targetEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    targetEl.classList.add('dragover');
  });
  targetEl.addEventListener('dragleave', () => {
    targetEl.classList.remove('dragover');
  });
  targetEl.addEventListener('drop', (e) => {
    e.preventDefault();
    targetEl.classList.remove('dragover');
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target.result;
        onContent(text);
        const ext = (file.name || '').split('.').pop().toLowerCase();
        if (onExtension) onExtension(ext);
      };
      reader.onerror = () => {
        console.error('Failed to read dropped file');
      };
      reader.readAsText(file);
    }
  });
}

function setupDragAndDrop() {
  const mainInput = document.getElementById('input-text');
  bindDropZone(mainInput, (text) => {
    mainInput.value = text;
  }, (ext) => {
    if (ext === 'yaml' || ext === 'yml') selectChip('yaml');
    else if (ext === 'toml') selectChip('toml');
    else selectChip('json');
  });

  const diffA = document.getElementById('diff-a');
  bindDropZone(diffA, (text) => {
    diffA.value = text;
  });

  const diffB = document.getElementById('diff-b');
  bindDropZone(diffB, (text) => {
    diffB.value = text;
  });
}

function selectChip(fmt) {
  currentFmt = fmt;
  document.querySelectorAll('.chip').forEach(c => {
    c.classList.toggle('active', c.dataset.fmt === fmt);
  });
}

function setupActions() {
  const runBtn = document.getElementById('btn-run');
  const outPane = document.getElementById('output-text');
  const t = () => UI_TEXTS[currentLang] || UI_TEXTS.en;

  runBtn.addEventListener('click', async () => {
    const raw = document.getElementById('input-text').value.trim();
    if (!raw) {
      outPane.textContent = t().emptyWarn;
      outPane.className = 'output-pane error';
      return;
    }

    if (config.engine !== 'local') {
      outPane.textContent = currentLang === 'ru' ? 'Обработка данных…' : 'Humanizing…';
      outPane.className = 'output-pane placeholder';
    }

    try {
      const parsed = parseBrowserData(raw, currentFmt);
      const mode = document.getElementById('sel-mode').value;
      const outFmt = document.getElementById('sel-format').value;

      const result = humanizeEngine(parsed, currentFmt, outFmt, mode, currentLang);
      outPane.textContent = result;
      outPane.className = 'output-pane';

      const statsEl = document.getElementById('popup-stats');
      if (statsEl) {
        const words = result.trim().split(/\s+/).filter(Boolean).length;
        const readingSecs = Math.max(1, Math.round(words / 3.5));
        document.getElementById('pop-words').textContent = currentLang === 'ru' ? `слов: ${words}` : `words: ${words}`;
        document.getElementById('pop-read').textContent = currentLang === 'ru' ? `чтение: ~${readingSecs} сек` : `read: ~${readingSecs}s`;
        statsEl.style.display = 'flex';
      }
    } catch (err) {
      outPane.textContent = t().parseErr + err.message;
      outPane.className = 'output-pane error';
      const statsEl = document.getElementById('popup-stats');
      if (statsEl) statsEl.style.display = 'none';
    }
  });

  // Re-run on mode or format change
  document.getElementById('sel-mode').addEventListener('change', () => {
    const raw = document.getElementById('input-text').value.trim();
    if (raw && !outPane.classList.contains('placeholder')) {
      runBtn.click();
    }
  });

  document.getElementById('sel-format').addEventListener('change', () => {
    const raw = document.getElementById('input-text').value.trim();
    if (raw && !outPane.classList.contains('placeholder')) {
      runBtn.click();
    }
  });

  // Diff run
  document.getElementById('btn-diff-run').addEventListener('click', () => {
    const diffA = document.getElementById('diff-a').value.trim();
    const diffB = document.getElementById('diff-b').value.trim();
    const diffOut = document.getElementById('diff-output');

    if (!diffA || !diffB) {
      diffOut.textContent = currentLang === 'ru' ? '⚠ Введите оба JSON для сравнения' : '⚠ Please provide both JSON values';
      diffOut.className = 'output-pane error';
      return;
    }

    try {
      const parsedA = parseBrowserData(diffA, 'json');
      const parsedB = parseBrowserData(diffB, 'json');
      diffOut.textContent = diffBrowserData(parsedA, parsedB, currentLang);
      diffOut.className = 'output-pane';
    } catch (err) {
      diffOut.textContent = '✖ ' + err.message;
      diffOut.className = 'output-pane error';
    }
  });

  // Copy button
  document.getElementById('btn-copy').addEventListener('click', () => {
    const text = outPane.textContent;
    if (text && !outPane.classList.contains('placeholder')) {
      navigator.clipboard.writeText(text);
      const btn = document.getElementById('lbl-copy');
      const orig = btn.textContent;
      btn.textContent = t().copied;
      setTimeout(() => { btn.textContent = orig; }, 1500);
    }
  });

  // Download button
  document.getElementById('btn-download').addEventListener('click', () => {
    const text = outPane.textContent;
    if (text && !outPane.classList.contains('placeholder')) {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `humanized-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  });

  // Text-to-speech button
  document.getElementById('btn-speak').addEventListener('click', () => {
    const text = outPane.textContent;
    if (!text || outPane.classList.contains('placeholder')) return;

    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      isSpeaking = false;
      document.getElementById('lbl-speak').textContent = t().btnSpeak;
      document.getElementById('btn-speak').classList.remove('speaking');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = currentLang === 'ru' ? 'ru-RU' : 'en-US';
    utterance.rate = 1.0;

    utterance.onstart = () => {
      isSpeaking = true;
      document.getElementById('lbl-speak').textContent = t().btnSpeaking;
      document.getElementById('btn-speak').classList.add('speaking');
    };

    utterance.onend = utterance.onerror = () => {
      isSpeaking = false;
      document.getElementById('lbl-speak').textContent = t().btnSpeak;
      document.getElementById('btn-speak').classList.remove('speaking');
    };

    window.speechSynthesis.speak(utterance);
  });
}

function setupSettings() {
  document.getElementById('cfg-engine').addEventListener('change', updateApiKeyVisibility);

  document.getElementById('btn-save-settings').addEventListener('click', async () => {
    const engine = document.getElementById('cfg-engine').value;
    const apiKey = document.getElementById('cfg-api-key').value.trim();
    const lang = document.getElementById('cfg-lang').value === 'Russian' ? 'ru' : 'en';

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({
        jh_engine: engine,
        jh_api_key: apiKey,
        jh_lang: lang
      });
    }

    config.engine = engine;
    config.apiKey = apiKey;
    config.defaultLang = lang;
    currentLang = lang;
    document.getElementById('lang-select').value = lang;
    applyLocalization(currentLang);

    const status = document.getElementById('settings-status');
    status.textContent = UI_TEXTS[currentLang].setSaved;
    status.style.color = 'var(--green)';
    setTimeout(() => { status.textContent = ''; }, 2000);
  });
}

// Active Tab Inspector & Grabber
function setupActiveTabDetector() {
  const btn = document.getElementById('btn-from-tab');
  const banner = document.getElementById('tab-detect-banner');
  const loadBtn = document.getElementById('btn-load-detected');

  async function checkActiveTab() {
    if (typeof chrome === 'undefined' || !chrome.tabs) return;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id || !tab.url || tab.url.startsWith('chrome://')) return;

      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const pre = document.querySelector('pre');
          const text = (pre ? pre.innerText : document.body.innerText).trim();
          if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
            try {
              JSON.parse(text);
              return text;
            } catch {}
          }
          return null;
        }
      });

      if (result && result.result) {
        detectedPageJson = result.result;
        banner.style.display = 'flex';
      }
    } catch (e) {
      // Quiet fail if restricted tab
    }
  }

  checkActiveTab();

  loadBtn.addEventListener('click', () => {
    if (detectedPageJson) {
      document.getElementById('input-text').value = detectedPageJson;
      selectChip('json');
      banner.style.display = 'none';
      document.getElementById('btn-run').click();
    }
  });

  btn.addEventListener('click', async () => {
    if (typeof chrome === 'undefined' || !chrome.tabs) return;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;

      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const pre = document.querySelector('pre');
          return (pre ? pre.innerText : document.body.innerText).trim();
        }
      });

      if (result && result.result) {
        document.getElementById('input-text').value = result.result;
        selectChip('json');
        document.getElementById('btn-run').click();
      }
    } catch (err) {
      console.warn('Could not grab content from tab:', err);
    }
  });
}
