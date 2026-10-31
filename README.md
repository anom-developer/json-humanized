<div align="center">

# 🗣️ json-humanized

**Transform any JSON / YAML / TOML into natural human language**

[![CI](https://github.com/anom-developer/json-humanized/actions/workflows/ci.yml/badge.svg)](https://github.com/anom-developer/json-humanized/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-00e5ff?style=flat-square)](LICENSE)
[![version](https://img.shields.io/badge/version-2.2.0-00ff9d?style=flat-square)](package.json)
[![node](https://img.shields.io/badge/node-%3E=16-339933?style=flat-square)](package.json)

**[🌐 Live Demo](https://anom-developer.github.io/json-humanized/)** &nbsp;·&nbsp;
**[🐛 Issues](https://github.com/anom-developer/json-humanized/issues)**
· [Installation](#installation) · [Usage](#usage) · [API](#api) · [Config](#config-file)
</div>

---

## What it does

> **[🌐 Try it live →](https://anom-developer.github.io/json-humanized/)**

```bash
$ jh user.json
```

```
This data contains a structured object with 6 fields.
• Identifier: usr_8f3k2
• Name: Alice Johnson
• Email address: alice@example.com
• Age: 28 years old
• Password: *** (hidden for security)
• Balance: $4.3K
• Created at: March 15, 2024 at 10:30 AM
• Last login: June 28, 2024 at 02:22 PM
```

Works **100% offline** (no API key needed) — or plug in Claude AI / OpenAI / Ollama for smarter descriptions.

---

## 🖱️ No Terminal? No Problem! (Для всех пользователей)

Если вы не умеете или не хотите пользоваться командной строкой (терминалом), вы можете использовать **json-humanized** в привычных программах:

### 1. 🌐 Расширение для браузера (Chrome, Edge, Brave, Opera, Яндекс)
- Превращает JSON прямо на веб-страницах и API-эндпоинтах в понятный текст в 1 клик!
- Контекстное меню (ПКМ по выделенному JSON -> *«Humanize JSON»*).
- Встроенная озвучка текста (Read Aloud 🔊), копирование и сохранение в файл.
- Установка за 15 секунд: откройте `chrome://extensions`, включите режим разработчика и выберите папку `extension/`. Подробнее: [Инструкция к расширению](extension/README.md).

### 2. ⚡ Запуск в 1 клик на компьютере (`start-ui.bat` / `start-ui.sh`)
- На Windows просто дважды кликните по файлу **`start-ui.bat`**.
- На Linux/macOS запустите **`start-ui.sh`**.
- В браузере сразу откроется удобный визуальный интерфейс с поддержкой перетаскивания файлов (Drag & Drop), сравнением (Diff) и озвучкой!

### 3. 🔌 Расширение для VS Code
- Установите или скопируйте расширение из папки `vscode-extension/`.
- Кликните правой кнопкой мыши по любому файлу `.json`, `.yaml` или `.toml` -> **«json-humanized: Transform to Human Language»** или **«Очеловечить (на русском)»**.

---

## Installation

```bash
npm install -g json-humanized
```

Or use without installing:

```bash
npx json-humanized data.json
```

---

## Usage

> **[🌐 Try it in the browser →](https://aceanomdev.github.io/json-humanized/)** — no install needed.

### CLI

```bash
# Basic — local engine (offline, instant)
jh data.json

# YAML and TOML also work
jh config.yaml
jh settings.toml

# AI-powered (Claude)
jh data.json --engine ai

# AI with OpenAI
jh data.json --engine ai --provider openai

# AI with local Ollama (no API key!)
jh data.json --engine ai --provider ollama

# Output formats
jh data.json --format markdown --output report.md
jh data.json --format story
jh data.json --format json
jh data.json --format csv
jh data.json --format html --output snippet.html
jh data.json --format sentence

# Diff two files
jh v1.json --diff v2.json
jh v1.json --diff v2.json --format markdown

# Watch mode — re-runs on every save
jh data.json --watch

# Stdin
echo '{"name":"Alice","age":30}' | jh --stdin

# Custom Handlebars template
jh data.json --template ./report.hbs

# Limit JSON chars sent to AI (saves tokens)
jh huge.json --engine ai --max-chars 8000

# Cache management
jh --cache-stats
jh --cache-clear

# Init config/template files
jh --init-config      # creates .jh.config.json
jh --init-template    # creates template.hbs
```

### All CLI flags

| Flag | Default | Description |
|------|---------|-------------|
| `--engine <engine>` | `local` | `local` or `ai` |
| `--provider <provider>` | `anthropic` | `anthropic`, `openai`, `ollama` |
| `--format <format>` | `plain` | `plain`, `markdown`, `story`, `json`, `sentence`, `csv`, `html` |
| `--mode <mode>` | `structured` | `structured`, `prose`, `story`, `sentence` |
| `--lang <lang>` | `English` | Any language (AI only) |
| `--context <text>` | — | Context hint for AI |
| `--api-key <key>` | env var | API key override |
| `--max-chars <n>` | `12000` | Max chars sent to AI |
| `--output <file>` | stdout | Save output to file |
| `--template <file>` | — | Handlebars `.hbs` template |
| `--diff <fileB>` | — | Compare two files |
| `--watch` | — | Re-run on file changes |
| `--config <file>` | auto | Explicit config file path |
| `--cache` / `--no-cache` | `true` | Enable/disable AI caching |
| `--cache-clear` | — | Delete all cached responses |
| `--cache-stats` | — | Show cache info |
| `--init-config` | — | Generate sample config |
| `--init-template` | — | Generate sample template |
| `--stdin` | — | Read from stdin |
| `--silent` | — | No spinner, no banner |

---

## API

```js
const {
  humanize,
  humanizeFile,
  humanizeString,
  humanizeBatch,
  summarize,
  diff,
} = require('json-humanized');

// Parse a JS value
const text = await humanize({ name: 'Alice', age: 30 });

// From a file (JSON, YAML, or TOML)
const text = await humanizeFile('./users.yaml', { format: 'markdown' });

// From a raw string
const text = await humanizeString('{"key":"value"}');

// Batch — process multiple values concurrently
const results = await humanizeBatch([
  { data: user1 },
  { data: user2, options: { format: 'json' } },
], { format: 'sentence', mode: 'sentence' }); // shared options

// Quick single-line summary (for tooltips, logs)
const line = summarize({ id: 'u1', name: 'Alice', salary: 90000 });
// → "id: u1 · name: Alice · salary: $90.0K"

// AI mode with caching
const text = await humanize(data, {
  engine:     'ai',
  aiProvider: 'anthropic',   // or 'openai' | 'ollama'
  format:     'plain',
  lang:       'Russian',
  cache:      true,
  cacheTTL:   3600,
});
```

### Diff

```js
const { diff } = require('json-humanized');

// Compare two objects
const result = await diff.diff(before, after);
// "Found 3 differences: …"

// Compare two files
const result = await diff.diffFiles('v1.json', 'v2.json', { format: 'markdown' });
```

### TypeScript

Full types are included — no `@types/` package needed:

```ts
import { humanize, humanizeFile, humanizeBatch, HumanizeOptions } from 'json-humanized';

const opts: HumanizeOptions = { engine: 'ai', aiProvider: 'ollama', format: 'markdown' };
const text = await humanizeFile('./data.json', opts);
```

---

## Output formats

| Format | Description |
|--------|-------------|
| `plain` | Human-readable text with `•` markers — default |
| `markdown` | Report with headers, metadata table, and timestamp |
| `story` | Narrative style inside a `━━━` border |
| `json` | JSON with `humanized` and `metadata` fields — for APIs/pipelines |
| `sentence` | One short sentence — for notifications and tooltips |
| `csv` | Compact `key=value` line for logs and spreadsheets |
| `html` | Ready-to-embed `<article class="jh-output">` snippet |

---

## Config file

Create `.jh.config.json` (or run `jh --init-config`) to set defaults:

```json
{
  "engine":   "local",
  "format":   "plain",
  "lang":     "English",
  "maxChars": 12000,
  "cache":    true,
  "cacheTTL": 3600,

  "fieldLabels": {
    "user_id":      "User ID",
    "txn_ref":      "Transaction reference",
    "internal_*":   null
  },

  "fieldTypes": {
    "invoice_no":   "id",
    "balance":      "money",
    "progress_pct": "percent",
    "timeout_ms":   "duration"
  },

  "hiddenFields": ["debug_*", "internal_hash"],

  "aiProvider":   "anthropic",
  "ollamaUrl":    "http://localhost:11434",
  "ollamaModel":  "llama3",
  "openaiModel":  "gpt-4o-mini"
}
```

Config is searched upward from the current directory (like ESLint / Prettier).

---

## Custom templates

Create a Handlebars template (or run `jh --init-template`):

```hbs
# {{filename}}
> Generated: {{timestamp}} · Engine: {{engine}}

{{humanized}}

---
*Type: {{stats.type}}, Keys: {{stats.keys}}*
```

Use it with:

```bash
jh data.json --template ./report.hbs
```

Available template variables: `{{humanized}}`, `{{filename}}`, `{{engine}}`, `{{format}}`, `{{timestamp}}`, `{{stats.type}}`, `{{stats.keys}}`, `{{stats.items}}`

---

## AI Providers

| Provider | Env Variable | Install |
|----------|-------------|---------|
| `anthropic` (default) | `ANTHROPIC_API_KEY` | `npm install @anthropic-ai/sdk` |
| `openai` | `OPENAI_API_KEY` | `npm install openai` |
| `ollama` | none needed | [Install Ollama](https://ollama.ai) |

Optional dependencies — install only what you use.

---

## Smart field detection

The local engine automatically recognises field types by name:

| Pattern | Detected as | Example output |
|---------|-------------|----------------|
| `id`, `uuid` | identifier | `Identifier: usr_8f2a` |
| `*_id` | reference | `User id: 42` |
| `created_at`, `timestamp`, `last_login` | datetime | `June 15, 2024 at 08:30 AM` |
| `email`, `*_mail` | email | `email address: alice@example.com` |
| `url`, `href`, `website` | url | `link: https://…` |
| `phone`, `mobile`, `tel` | phone | `phone: +1-555-0147` |
| `price`, `salary`, `balance` | money | `$4.3K` / `$1.50M` |
| `*_count`, `total`, `qty` | count | `5 items` |
| `lat` / `lng` | coordinates | `51.5° N` / `37.6° E` |
| `password`, `token`, `secret` | sensitive | `*** (hidden for security)` |
| `progress_pct`, `completion_percent` | percent | `74%` |
| `timeout_ms`, `elapsed_seconds` | duration | `2.5 seconds` |
| `rating`, `score` | rating | `9 out of 10` |
| `age` | age | `28 years old` |
| `is_*`, `has_*`, `enabled` | boolean flag | `yes (active is enabled)` |

---

## Caching

AI responses are cached by default in `~/.jh-cache/`.

- Same JSON + same options → returns cached result instantly
- Cache TTL: 1 hour (configurable)
- Override: `jh data.json --engine ai --no-cache`
- Clear all: `jh --cache-clear`
- Custom dir: `JH_CACHE_DIR=/tmp/my-cache jh data.json --engine ai`

---

## Diff

```bash
$ jh v1.json --diff v2.json

Found 3 differences:

➕ Added (1):
   + phone (phone): "+1-555-0100"

✏  Changed (2):
   ~ name (name): "Alice" → "Alice Johnson"
   ~ balance (balance): $4.3K → $4.5K
```

```bash
# AI-powered diff (more natural language)
$ jh v1.json --diff v2.json --engine ai --lang Russian
```

---

## Supported file types

| Extension | Notes |
|-----------|-------|
| `.json` | Always available |
| `.yaml`, `.yml` | Requires `npm install js-yaml` |
| `.toml` | Requires `npm install @iarna/toml` |

---

## Project structure

```
json-humanized/
├── bin/
│   └── cli.js                  # CLI entry point
├── src/
│   ├── index.js                # Public API
│   ├── humanizer.js            # Rule-based engine
│   ├── config.js               # Config file loader
│   ├── cache.js                # AI response cache
│   ├── diff.js                 # Diff engine
│   ├── watch.js                # File watcher
│   ├── parsers/
│   │   └── index.js            # JSON / YAML / TOML parser
│   ├── formatters/
│   │   ├── index.js            # plain, markdown, story, json, sentence, csv, html
│   │   └── template.js         # Handlebars template renderer
│   └── strategies/
│       ├── ai.js               # AI provider router
│       ├── openai.js           # OpenAI provider
│       └── ollama.js           # Ollama provider
├── docs/
├── examples/
├── test/
│   ├── index.test.js           # 43 core tests
│   └── full_audit.js           # 88 exhaustive checks
├── index.d.ts                  # TypeScript types
└── package.json
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Issues and PRs are welcome!

---

## License

MIT © json-humanized contributors
