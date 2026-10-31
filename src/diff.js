'use strict';

/**
 * diff.js — compare two JSON values and describe changes in human language.
 * Works with both local rule-based and AI engines.
 */

// ─── helpers ────────────────────────────────────────────────────────────────

function typeLabel(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

function friendlyKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
}

function formatValue(v) {
  if (v === null) return 'null';
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return `"${v}"`;
  if (Array.isArray(v)) return `[array with ${v.length} item(s)]`;
  if (typeof v === 'object') return `{object with ${Object.keys(v).length} key(s)}`;
  return String(v);
}

// ─── core diff logic ─────────────────────────────────────────────────────────

function diffObjects(a, b, path = '') {
  const changes = [];
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const key of allKeys) {
    const fullPath = path ? `${path}.${key}` : key;
    const label = friendlyKey(key);

    if (!(key in a)) {
      changes.push({ type: 'added', path: fullPath, label, value: b[key] });
    } else if (!(key in b)) {
      changes.push({ type: 'removed', path: fullPath, label, value: a[key] });
    } else if (
      typeof a[key] === 'object' && a[key] !== null &&
      typeof b[key] === 'object' && b[key] !== null &&
      !Array.isArray(a[key]) && !Array.isArray(b[key])
    ) {
      const nested = diffObjects(a[key], b[key], fullPath);
      changes.push(...nested);
    } else if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
      changes.push({
        type: 'changed',
        path: fullPath,
        label,
        from: a[key],
        to: b[key],
      });
    }
  }

  return changes;
}

function diffArrays(a, b) {
  const changes = [];
  const maxLen = Math.max(a.length, b.length);

  for (let i = 0; i < maxLen; i++) {
    if (i >= b.length) {
      changes.push({ type: 'removed', path: `[${i}]`, label: `item ${i + 1}`, value: a[i] });
    } else if (i >= a.length) {
      changes.push({ type: 'added', path: `[${i}]`, label: `item ${i + 1}`, value: b[i] });
    } else if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) {
      changes.push({ type: 'changed', path: `[${i}]`, label: `item ${i + 1}`, from: a[i], to: b[i] });
    }
  }

  return changes;
}

function collectChanges(a, b) {
  const ta = typeLabel(a);
  const tb = typeLabel(b);

  if (ta !== tb) {
    return [{ type: 'type_changed', from: ta, to: tb, fromValue: a, toValue: b }];
  }

  if (ta === 'object') return diffObjects(a, b);
  if (ta === 'array') return diffArrays(a, b);

  if (JSON.stringify(a) !== JSON.stringify(b)) {
    return [{ type: 'changed', path: 'root', label: 'value', from: a, to: b }];
  }

  return [];
}

// ─── render changes to text ──────────────────────────────────────────────────

function isRussian(lang) {
  return typeof lang === 'string' && (lang.toLowerCase() === 'ru' || lang.toLowerCase() === 'russian');
}

function renderChanges(changes, format = 'plain', lang = 'en') {
  const ru = isRussian(lang);

  if (changes.length === 0) {
    if (ru) {
      return format === 'markdown'
        ? '## ✅ Различий не обнаружено\n\nОба значения **идентичны**.'
        : '✅ Различий не обнаружено — оба значения идентичны.';
    }
    return format === 'markdown'
      ? '## ✅ No differences\n\nThe two JSON values are **identical**.'
      : '✅ No differences — the two JSON values are identical.';
  }

  const added   = changes.filter(c => c.type === 'added');
  const removed = changes.filter(c => c.type === 'removed');
  const changed = changes.filter(c => c.type === 'changed');
  const typeChg = changes.filter(c => c.type === 'type_changed');

  const lines = [];

  if (format === 'markdown') {
    lines.push(ru
      ? `## 🔀 Сравнение — найдено ${changes.length} изменений\n`
      : `## 🔀 JSON Diff — ${changes.length} change(s) found\n`);

    if (typeChg.length) {
      lines.push(ru ? `### ⚠️ Изменился тип` : `### ⚠️ Type changed`);
      for (const c of typeChg) {
        lines.push(ru
          ? `- Корневой тип изменился с **${c.from}** на **${c.to}**`
          : `- Root type changed from **${c.from}** to **${c.to}**`);
      }
      lines.push('');
    }

    if (added.length) {
      lines.push(ru ? `### ➕ Добавлено (${added.length})` : `### ➕ Added (${added.length})`);
      for (const c of added) {
        lines.push(ru
          ? `- **${c.label}** \`${c.path}\` добавлено со значением ${formatValue(c.value)}`
          : `- **${c.label}** \`${c.path}\` was added with value ${formatValue(c.value)}`);
      }
      lines.push('');
    }

    if (removed.length) {
      lines.push(ru ? `### ➖ Удалено (${removed.length})` : `### ➖ Removed (${removed.length})`);
      for (const c of removed) {
        lines.push(ru
          ? `- **${c.label}** \`${c.path}\` удалено (было ${formatValue(c.value)})`
          : `- **${c.label}** \`${c.path}\` was removed (was ${formatValue(c.value)})`);
      }
      lines.push('');
    }

    if (changed.length) {
      lines.push(ru ? `### ✏️ Изменено (${changed.length})` : `### ✏️ Changed (${changed.length})`);
      for (const c of changed) {
        lines.push(`- **${c.label}** \`${c.path}\`: ${formatValue(c.from)} → ${formatValue(c.to)}`);
      }
      lines.push('');
    }
  } else {
    lines.push(ru
      ? `Найдено ${changes.length} различий:\n`
      : `Found ${changes.length} difference(s):\n`);

    if (typeChg.length) {
      for (const c of typeChg) {
        lines.push(ru
          ? `⚠  Корневой тип изменился: ${c.from} → ${c.to}`
          : `⚠  Root type changed: ${c.from} → ${c.to}`);
      }
    }

    if (added.length) {
      lines.push(ru ? `\n➕ Добавлено (${added.length}):` : `\n➕ Added (${added.length}):`);
      for (const c of added) {
        lines.push(`   + ${c.label} (${c.path}): ${formatValue(c.value)}`);
      }
    }

    if (removed.length) {
      lines.push(ru ? `\n➖ Удалено (${removed.length}):` : `\n➖ Removed (${removed.length}):`);
      for (const c of removed) {
        lines.push(ru
          ? `   - ${c.label} (${c.path}): было ${formatValue(c.value)}`
          : `   - ${c.label} (${c.path}): was ${formatValue(c.value)}`);
      }
    }

    if (changed.length) {
      lines.push(ru ? `\n✏  Изменено (${changed.length}):` : `\n✏  Changed (${changed.length}):`);
      for (const c of changed) {
        lines.push(`   ~ ${c.label} (${c.path}): ${formatValue(c.from)} → ${formatValue(c.to)}`);
      }
    }
  }

  return lines.join('\n');
}

// ─── AI-powered diff ─────────────────────────────────────────────────────────

async function diffWithAI(a, b, options = {}) {
  const { apiKey, lang = 'English', context = '' } = options;

  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is required for AI diff mode');

  let AnthropicSDK;
  try {
    AnthropicSDK = require('@anthropic-ai/sdk');
  } catch {
    throw new Error('Install @anthropic-ai/sdk: npm install @anthropic-ai/sdk');
  }

  // FIX: consistent SDK instantiation (same pattern as ai.js)
  const Anthropic = AnthropicSDK.default || AnthropicSDK.Anthropic || AnthropicSDK;
  const client = new Anthropic({ apiKey: key });

  const prompt = [
    context ? `Context: ${context}\n` : '',
    'You are a JSON diff analyst. Compare these two JSON values and describe all differences in plain, natural language.',
    `Respond in ${lang}.`,
    'Be concise but thorough. Group changes by: added fields, removed fields, changed values.',
    '',
    'BEFORE:',
    JSON.stringify(a, null, 2).slice(0, 6000),
    '',
    'AFTER:',
    JSON.stringify(b, null, 2).slice(0, 6000),
  ].filter(Boolean).join('\n');

  // FIX: correct model name
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Diff two JavaScript values and return a human-readable description.
 *
 * @param {*} a       - "before" value
 * @param {*} b       - "after" value
 * @param {object} options
 * @param {'local'|'ai'} [options.engine='local']
 * @param {'plain'|'markdown'|'json'} [options.format='plain']
 * @param {string} [options.lang='English']   (AI only)
 * @param {string} [options.context='']       (AI only)
 * @param {string} [options.apiKey]
 * @returns {Promise<string>}
 */
async function diff(a, b, options = {}) {
  const { engine = 'local', format = 'plain', lang = 'en' } = options;

  if (engine === 'ai') {
    return diffWithAI(a, b, options);
  }

  const changes = collectChanges(a, b);

  if (format === 'json') {
    return JSON.stringify({
      changes,
      summary: {
        total: changes.length,
        added:   changes.filter(c => c.type === 'added').length,
        removed: changes.filter(c => c.type === 'removed').length,
        changed: changes.filter(c => c.type === 'changed').length,
      },
    }, null, 2);
  }

  return renderChanges(changes, format, lang);
}

/**
 * Diff two JSON files.
 */
async function diffFiles(fileA, fileB, options = {}) {
  const fs = require('fs');
  const { parseAny } = require('./parsers');

  const rawA = fs.readFileSync(fileA, 'utf8');
  const rawB = fs.readFileSync(fileB, 'utf8');

  const a = parseAny(rawA, fileA);
  const b = parseAny(rawB, fileB);

  return diff(a, b, options);
}

module.exports = { diff, diffFiles };
