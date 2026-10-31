'use strict';

/**
 * cache.js — file-based cache for AI responses.
 *
 * Saves API tokens by reusing results for identical (JSON + options) combos.
 * Cache files are stored in ~/.jh-cache/ (or $JH_CACHE_DIR).
 * Each entry expires after `ttl` seconds (default 3600 = 1 hour).
 *
 * No external dependencies — uses built-in crypto + fs.
 */

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const os     = require('os');

// ─── cache directory ─────────────────────────────────────────────────────────

let resolvedCacheDir = null;

function getCacheDir() {
  if (process.env.JH_CACHE_DIR) return process.env.JH_CACHE_DIR;
  if (resolvedCacheDir) return resolvedCacheDir;

  const homeCandidate = path.join(os.homedir(), '.jh-cache');
  try {
    if (!fs.existsSync(homeCandidate)) {
      fs.mkdirSync(homeCandidate, { recursive: true });
    }
    const testFile = path.join(homeCandidate, `.test-${process.pid}`);
    fs.writeFileSync(testFile, '1');
    fs.unlinkSync(testFile);
    resolvedCacheDir = homeCandidate;
    return resolvedCacheDir;
  } catch {
    const tmpCandidate = path.join(os.tmpdir(), '.jh-cache');
    try {
      if (!fs.existsSync(tmpCandidate)) {
        fs.mkdirSync(tmpCandidate, { recursive: true });
      }
    } catch {}
    resolvedCacheDir = tmpCandidate;
    return resolvedCacheDir;
  }
}

function ensureCacheDir() {
  const dir = getCacheDir();
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }
  return dir;
}

// ─── cache key ───────────────────────────────────────────────────────────────

/**
 * Build a stable cache key from JSON content + relevant options.
 * We hash the combination so filenames stay short and filesystem-safe.
 */
function buildCacheKey(data, options = {}) {
  const { engine, format, lang, context, aiProvider, mode } = options;

  const payload = JSON.stringify({
    data,
    engine:     engine     || 'local',
    format:     format     || 'plain',
    lang:       lang       || 'English',
    context:    context    || '',
    aiProvider: aiProvider || 'anthropic',
    mode:       mode       || 'structured',
  });

  return crypto.createHash('sha256').update(payload).digest('hex');
}

// ─── read / write ────────────────────────────────────────────────────────────

/**
 * Try to read a cached result.
 * Returns the cached string, or null if miss / expired.
 *
 * @param {string} key   from buildCacheKey()
 * @param {number} ttl   seconds; 0 = never expire
 * @returns {string|null}
 */
function readCache(key, ttl = 3600) {
  try {
    const file = path.join(getCacheDir(), `${key}.json`);
    if (!fs.existsSync(file)) return null;

    const entry = JSON.parse(fs.readFileSync(file, 'utf8'));

    if (ttl > 0) {
      const ageSeconds = (Date.now() - entry.savedAt) / 1000;
      if (ageSeconds > ttl) {
        fs.unlinkSync(file); // clean up expired entry
        return null;
      }
    }

    return entry.result;
  } catch {
    return null;
  }
}

/**
 * Write a result to the cache.
 *
 * @param {string} key
 * @param {string} result  the humanized text to cache
 */
function writeCache(key, result) {
  try {
    ensureCacheDir();
    const file  = path.join(getCacheDir(), `${key}.json`);
    const entry = { savedAt: Date.now(), result };
    fs.writeFileSync(file, JSON.stringify(entry), 'utf8');
  } catch {
    // Cache write failures are silent — the caller still gets a valid result
  }
}

// ─── cache management ────────────────────────────────────────────────────────

/**
 * Delete all cache entries.
 * @returns {number} number of files deleted
 */
function clearCache() {
  const dir = getCacheDir();
  if (!fs.existsSync(dir)) return 0;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  for (const f of files) {
    try { fs.unlinkSync(path.join(dir, f)); } catch {}
  }
  return files.length;
}

/**
 * Return cache statistics.
 * @returns {{ entries: number, totalBytes: number, dir: string }}
 */
function cacheStats() {
  const dir = getCacheDir();
  if (!fs.existsSync(dir)) return { entries: 0, totalBytes: 0, dir };

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  let totalBytes = 0;

  for (const f of files) {
    try {
      totalBytes += fs.statSync(path.join(dir, f)).size;
    } catch {}
  }

  return { entries: files.length, totalBytes, dir };
}

// ─── wrapped fetch helper ────────────────────────────────────────────────────

/**
 * Call `fn` with caching: return cached result if available, otherwise
 * call `fn`, cache its output, and return it.
 *
 * @param {*}        data         JSON data (used to build the cache key)
 * @param {object}   options      humanize options (used to build the cache key)
 * @param {Function} fn           async () => string  — the real API call
 * @param {boolean}  [enabled]    pass false to bypass cache entirely
 * @returns {Promise<string>}
 */
async function withCache(data, options, fn, enabled = true) {
  if (!enabled) return fn();

  const ttl = options.cacheTTL != null ? options.cacheTTL : 3600;
  const key = buildCacheKey(data, options);

  const cached = readCache(key, ttl);
  if (cached !== null) return cached;

  const result = await fn();
  writeCache(key, result);
  return result;
}

module.exports = {
  buildCacheKey,
  readCache,
  writeCache,
  clearCache,
  cacheStats,
  withCache,
};
