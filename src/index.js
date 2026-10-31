'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  json-humanized · Main public API  (v2.2)
// ─────────────────────────────────────────────────────────────────────────────

const fs   = require('fs');
const path = require('path');

const { humanizeLocal, humanizeToSentence, summarize } = require('./humanizer');
const { humanizeWithAI } = require('./strategies/ai');
const { applyFormat }    = require('./formatters');
const { withCache }      = require('./cache');
const { loadConfig }     = require('./config');
const { parseAny, parseFile } = require('./parsers');

// ─── stats helper ────────────────────────────────────────────────────────────

function computeStats(data) {
  const stats = {};
  if (Array.isArray(data)) {
    stats['Type'] = 'Array';
    stats['Total items'] = data.length;
    if (data.length > 0 && typeof data[0] === 'object') {
      stats['Keys per record'] = Object.keys(data[0] || {}).length;
    }
  } else if (typeof data === 'object' && data !== null) {
    stats['Type'] = 'Object';
    stats['Top-level keys'] = Object.keys(data).length;
    const nested = Object.values(data).filter(v => typeof v === 'object' && v !== null).length;
    if (nested > 0) stats['Nested objects'] = nested;
  } else {
    stats['Type'] = typeof data;
    stats['Value'] = String(data).slice(0, 50);
  }
  return stats;
}

// ─── core humanize ───────────────────────────────────────────────────────────

/**
 * Core humanize function — works on already-parsed data.
 *
 * @param {any}    data
 * @param {object} [options]
 * @param {'local'|'ai'}                        [options.engine='local']
 * @param {'anthropic'|'openai'|'ollama'}       [options.aiProvider='anthropic']
 * @param {string}                              [options.apiKey]
 * @param {'plain'|'markdown'|'story'|'json'|'sentence'|'csv'|'html'} [options.format='plain']
 * @param {'prose'|'structured'|'story'}        [options.mode='structured']
 * @param {string}                              [options.lang='English']
 * @param {string}                              [options.context='']
 * @param {string}                              [options.filename='']
 * @param {number}                              [options.maxChars=12000]
 * @param {string}                              [options.template]  path to .hbs template
 * @param {boolean}                             [options.cache=true]
 * @param {number}                              [options.cacheTTL=3600]
 * @param {string}                              [options.configPath]  explicit config file
 * @returns {Promise<string>}
 */
async function humanize(data, options = {}) {
  // Merge config file options (if any) — CLI/API options take precedence
  const { config } = loadConfig(options.configPath);
  const merged = { ...config, ...options };

  const {
    engine     = 'local',
    aiProvider = 'anthropic',
    apiKey     = process.env.ANTHROPIC_API_KEY,
    format     = 'plain',
    mode       = 'structured',
    lang       = 'English',
    context    = '',
    filename   = '',
    maxChars   = 12000,
    template,
    cache      = true,
    cacheTTL   = 3600,
  } = merged;

  const sourceFormat = merged.sourceFormat || null;

  const engineFn = async () => {
    if (engine === 'ai') {
      return humanizeWithAI(data, { apiKey, aiProvider, mode, lang, context, maxChars, ...merged });
    }
    if (mode === 'sentence') {
      return humanizeToSentence(data, { sourceFormat, maxItems: merged.maxItems, lang });
    }
    return humanizeLocal(data, { mode, sourceFormat, lang });
  };

  // Use cache only for AI engine (local is instant)
  const text = engine === 'ai'
    ? await withCache(data, { engine, aiProvider, format, lang, context, cacheTTL }, engineFn, cache)
    : await engineFn();

  const stats = computeStats(data);
  const meta  = { engine, aiProvider, filename, sourceFormat, timestamp: new Date().toISOString(), stats, data, lang };

  // Template output takes priority over standard formatters
  if (template) {
    const { renderTemplate } = require('./formatters/template');
    return renderTemplate(text, template, meta);
  }

  return applyFormat(text, format, meta);
}

// ─── file humanizer ──────────────────────────────────────────────────────────

/**
 * Humanize a JSON/YAML/TOML file from disk.
 *
 * @param {string} filePath
 * @param {object} [options]  same as humanize()
 */
async function humanizeFile(filePath, options = {}) {
  const resolved = path.resolve(filePath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }

  const data = parseFile(resolved);

  const ext = path.extname(resolved).slice(1).toLowerCase();
  const sourceFormat = ['yaml', 'yml', 'toml', 'json'].includes(ext) ? ext : undefined;

  return humanize(data, {
    ...options,
    filename: options.filename || path.basename(resolved),
    sourceFormat: options.sourceFormat || sourceFormat,
  });
}

// ─── string humanizer ────────────────────────────────────────────────────────

/**
 * Humanize a raw JSON/YAML/TOML string.
 *
 * @param {string} rawString
 * @param {object} [options]
 */
async function humanizeString(rawString, options = {}) {
  let data;
  try {
    data = parseAny(rawString, options.filename || '');
  } catch (err) {
    // FIX: parseAny already prefixes "Invalid JSON:" — don't double-wrap
    const msg = err.message.startsWith('Invalid JSON')
      ? err.message
      : `Invalid JSON: ${err.message}`;
    throw new Error(msg);
  }
  return humanize(data, options);
}

// ─── NEW: batch humanizer ────────────────────────────────────────────────────

/**
 * Humanize multiple values concurrently.
 *
 * @param {Array<{data: any, options?: object}>} items
 * @param {object} [sharedOptions]  applied to all items (overridden per-item)
 * @returns {Promise<string[]>}
 */
async function humanizeBatch(items, sharedOptions = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('humanizeBatch: items must be a non-empty array');
  }
  return Promise.all(
    items.map(({ data, options = {} }) =>
      humanize(data, { ...sharedOptions, ...options })
    )
  );
}

// ─── exports ─────────────────────────────────────────────────────────────────

module.exports = {
  humanize,
  humanizeFile,
  humanizeString,
  humanizeBatch,
  // Re-export sub-modules for power users
  diff:      require('./diff'),
  cache:     require('./cache'),
  config:    require('./config'),
  watch:     require('./watch'),
  summarize: require('./humanizer').summarize,
};
