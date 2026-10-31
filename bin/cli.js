#!/usr/bin/env node
'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  json-humanized · CLI v2.2
//  Usage: jh <file> [options]
//         jh --diff a.json b.json
//         jh --watch file.json
//         echo '{"key":"val"}' | jh --stdin
// ─────────────────────────────────────────────────────────────────────────────

const { program } = require('commander');
const chalk        = require('chalk');
const ora          = require('ora');
const fs           = require('fs');
const path         = require('path');

const { humanizeFile, humanizeString } = require('../src/index');
const { diff, diffFiles }              = require('../src/diff');
const { watch }                        = require('../src/watch');
const { clearCache, cacheStats }       = require('../src/cache');
const { generateExampleConfig }        = require('../src/config');
const { generateExampleTemplate }      = require('../src/formatters/template');
const pkg = require('../package.json');

// ─── banner ──────────────────────────────────────────────────────────────────

function printBanner() {
  console.log('');
  console.log(chalk.bold.cyan('  ╔══════════════════════════════════╗'));
  console.log(chalk.bold.cyan('  ║') + chalk.bold.white('       json-humanized  v' + pkg.version + '      ') + chalk.bold.cyan('║'));
  console.log(chalk.bold.cyan('  ║') + chalk.gray('   Turn JSON into human language   ') + chalk.bold.cyan('║'));
  console.log(chalk.bold.cyan('  ╚══════════════════════════════════╝'));
  console.log('');
}

// ─── CLI definition ──────────────────────────────────────────────────────────

program
  .name('json-humanized')
  .alias('jh')
  .version(pkg.version, '-v, --version', 'Show version')
  .description(chalk.cyan('Transform any JSON/YAML/TOML into natural human language\n') +
    chalk.gray('  Supports files, stdin, diff, watch, batch, and AI-powered descriptions'))

  .argument('[file]', 'JSON/YAML/TOML file to humanize (or use --stdin)')

  // ── Input
  .option('--stdin',                    'Read from stdin instead of a file')
  .option('--diff <fileB>',             'Compare <file> with <fileB> and describe differences')

  // ── Engine & Provider
  .option('-e, --engine <engine>',      'Engine: local (default) or ai',                'local')
  .option('--provider <provider>',      'AI provider: anthropic, openai, ollama',       'anthropic')

  // ── GUI / Web UI
  .option('--ui',                       'Launch interactive web UI in browser')
  .option('--gui',                      'Alias for --ui')
  .option('--port <port>',              'Port for web UI (default: 3456)',              '3456')

  // ── Output
  // FIX: added csv and html to the format list in help text
  .option('-f, --format <format>',      'Output format: plain, markdown, story, json, sentence, csv, html',  'plain')
  .option('-m, --mode <mode>',          'Description mode: structured, prose, story, sentence',   'structured')
  .option('-o, --output <file>',        'Save output to a file')
  .option('--template <file>',          'Handlebars .hbs template for custom output')

  // ── Language & AI options
  .option('-l, --lang <lang>',          'Output language: English, Russian/ru, etc.',    'English')
  .option('-c, --context <text>',       'Context hint for AI (e.g. "Stripe webhook")',   '')
  .option('-k, --api-key <key>',        'API key (overrides env variable)')
  .option('--max-chars <n>',            'Max JSON chars sent to AI (default 12000)',     '12000')

  // ── Watch
  .option('--watch',                    'Watch file and re-humanize on every save')

  // ── Config
  .option('--config <file>',            'Path to .jh.config.json config file')
  .option('--init-config',              'Create a sample .jh.config.json in current directory')
  .option('--init-template',            'Create a sample template.hbs in current directory')

  // ── Cache
  .option('--no-cache',                 'Bypass AI response cache for this run')
  .option('--cache-clear',              'Clear all cached AI responses and exit')
  .option('--cache-stats',              'Show cache statistics and exit')

  // ── Misc
  .option('--no-banner',                'Suppress the banner')
  .option('--silent',                   'No spinner or banner, just output')

  .addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.cyan('$')} jh data.json
  ${chalk.cyan('$')} jh data.yaml --format markdown --output report.md
  ${chalk.cyan('$')} jh data.json --format html --output summary.html
  ${chalk.cyan('$')} jh users.json --engine ai --lang Spanish
  ${chalk.cyan('$')} jh a.json --diff b.json
  ${chalk.cyan('$')} jh config.json --watch
  ${chalk.cyan('$')} echo '{"name":"Alice","age":30}' | jh --stdin
  ${chalk.cyan('$')} jh payload.json --engine ai --provider openai
  ${chalk.cyan('$')} jh payload.json --engine ai --provider ollama
  ${chalk.cyan('$')} jh big.json --engine ai --max-chars 8000
  ${chalk.cyan('$')} jh data.json --template ./report.hbs

${chalk.bold('Engines:')}
  ${chalk.yellow('local')}  — Fast, offline, rule-based. No API key needed.
  ${chalk.yellow('ai')}     — AI-powered. See --provider for supported backends.

${chalk.bold('AI Providers:')}
  ${chalk.yellow('anthropic')}  — Claude (default). Needs ANTHROPIC_API_KEY.
  ${chalk.yellow('openai')}     — GPT models. Needs OPENAI_API_KEY.
  ${chalk.yellow('ollama')}     — Local models (llama3, mistral…). No key needed.

${chalk.bold('Formats:')}
  ${chalk.yellow('plain')}     — Human-readable text (default)
  ${chalk.yellow('markdown')}  — Markdown report with headers and table
  ${chalk.yellow('story')}     — Narrative storytelling style
  ${chalk.yellow('json')}      — JSON output with metadata
  ${chalk.yellow('sentence')}  — Single concise sentence
  ${chalk.yellow('csv')}       — CSV-friendly one-liner
  ${chalk.yellow('html')}      — HTML <article> snippet

${chalk.bold('Environment Variables:')}
  ANTHROPIC_API_KEY   — API key for Claude AI engine
  OPENAI_API_KEY      — API key for OpenAI engine
  OLLAMA_URL          — Ollama base URL (default: http://localhost:11434)
  OLLAMA_MODEL        — Ollama model name (default: llama3)
  JH_CACHE_DIR        — Custom cache directory (default: ~/.jh-cache)
`);

program.parse(process.argv);

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const opts   = program.opts();
  const [file] = program.args;
  const silent = opts.silent;

  if (!silent && opts.banner !== false) printBanner();

  // ── GUI / Web UI mode ────────────────────────────────────────────────────
  if (opts.ui || opts.gui) {
    const { startServer } = require('../src/server');
    await startServer({ port: parseInt(opts.port, 10), open: true });
    return;
  }

  // ── Cache management commands ────────────────────────────────────────────
  if (opts.cacheStats) {
    const s = cacheStats();
    console.log(chalk.cyan('  Cache statistics:'));
    console.log(`    Directory : ${s.dir}`);
    console.log(`    Entries   : ${s.entries}`);
    console.log(`    Size      : ${(s.totalBytes / 1024).toFixed(1)} KB`);
    return;
  }

  if (opts.cacheClear) {
    const n = clearCache();
    console.log(chalk.green(`  ✓  Cleared ${n} cached AI response(s)`));
    return;
  }

  // ── Init commands ────────────────────────────────────────────────────────
  if (opts.initConfig) {
    const target = path.join(process.cwd(), '.jh.config.json');
    fs.writeFileSync(target, generateExampleConfig(), 'utf8');
    console.log(chalk.green(`  ✓  Created ${target}`));
    return;
  }

  if (opts.initTemplate) {
    const target = path.join(process.cwd(), 'template.hbs');
    generateExampleTemplate(target);
    console.log(chalk.green(`  ✓  Created ${target}`));
    return;
  }

  // ── Diff mode ────────────────────────────────────────────────────────────
  if (opts.diff) {
    if (!file) {
      console.error(chalk.red('  ✖  --diff requires a first file argument: jh a.json --diff b.json'));
      process.exit(1);
    }

    const spinner = !silent ? ora({ text: chalk.cyan('Comparing files…'), color: 'cyan' }).start() : null;

    try {
      const result = await diffFiles(file, opts.diff, {
        engine:  opts.engine,
        format:  opts.format,
        apiKey:  opts.apiKey || process.env.ANTHROPIC_API_KEY,
        lang:    opts.lang,
      });
      spinner && spinner.succeed(chalk.green('Done!'));
      outputResult(result, opts, silent);
    } catch (err) {
      spinner && spinner.fail(chalk.red('Failed'));
      exitError(err);
    }
    return;
  }

  // ── Watch mode ───────────────────────────────────────────────────────────
  if (opts.watch) {
    if (!file) {
      console.error(chalk.red('  ✖  --watch requires a file argument'));
      process.exit(1);
    }

    const options = buildOptions(opts);
    const { humanize } = require('../src/index');

    watch(file, options, async (data, watchOpts) => {
      return humanize(data, watchOpts);
    });
    return; // watch keeps running
  }

  // ── Standard humanize ────────────────────────────────────────────────────
  if (!file && !opts.stdin) {
    console.error(chalk.red('  ✖  Please provide a JSON/YAML/TOML file or use --stdin'));
    console.error(chalk.gray('     Run `jh --help` for usage information'));
    process.exit(1);
  }

  validateOpts(opts);

  const spinner = !silent ? ora({
    text: opts.engine === 'ai'
      ? chalk.cyan(`Sending to ${opts.provider} AI…`)
      : chalk.cyan('Analysing structure…'),
    color: 'cyan',
  }).start() : null;

  try {
    const options = buildOptions(opts);
    let result;

    if (opts.stdin) {
      const raw = await readStdin();
      if (!raw.trim()) {
        spinner && spinner.fail('No input received from stdin');
        process.exit(1);
      }
      result = await humanizeString(raw, options);
    } else {
      if (!fs.existsSync(path.resolve(file))) {
        spinner && spinner.fail(`File not found: ${file}`);
        process.exit(1);
      }
      result = await humanizeFile(file, { ...options, filename: path.basename(file) });
    }

    spinner && spinner.succeed(chalk.green('Done!'));
    outputResult(result, opts, silent);

  } catch (err) {
    spinner && spinner.fail(chalk.red('Failed'));
    exitError(err);
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildOptions(opts) {
  // When --format sentence is used, automatically enable sentence mode
  const mode = (opts.format === 'sentence' && opts.mode === 'structured')
    ? 'sentence'
    : opts.mode;

  return {
    engine:     opts.engine,
    aiProvider: opts.provider,
    format:     opts.format,
    mode,
    lang:       opts.lang,
    context:    opts.context,
    apiKey:     opts.apiKey || process.env.ANTHROPIC_API_KEY,
    maxChars:   parseInt(opts.maxChars, 10) || 12000,
    template:   opts.template,
    cache:      opts.cache !== false,
    configPath: opts.config,
  };
}

function outputResult(result, opts, silent) {
  if (opts.output) {
    fs.writeFileSync(path.resolve(opts.output), result, 'utf8');
    if (!silent) console.log('\n' + chalk.green(`  ✓  Saved to: ${chalk.bold(opts.output)}`));
  } else {
    console.log('\n' + result);
  }
}

function validateOpts(opts) {
  const validEngines   = ['local', 'ai'];
  // FIX: added csv and html to valid formats
  const validFormats   = ['plain', 'markdown', 'story', 'json', 'sentence', 'csv', 'html'];
  const validProviders = ['anthropic', 'openai', 'ollama'];

  if (!validEngines.includes(opts.engine)) {
    console.error(chalk.red(`  ✖  Unknown engine: ${opts.engine}. Use: ${validEngines.join(', ')}`));
    process.exit(1);
  }
  if (!validFormats.includes(opts.format)) {
    console.error(chalk.red(`  ✖  Unknown format: ${opts.format}. Use: ${validFormats.join(', ')}`));
    process.exit(1);
  }
  if (opts.engine === 'ai' && !validProviders.includes(opts.provider)) {
    console.error(chalk.red(`  ✖  Unknown provider: ${opts.provider}. Use: ${validProviders.join(', ')}`));
    process.exit(1);
  }

  const apiKey = opts.apiKey || process.env.ANTHROPIC_API_KEY;
  if (opts.engine === 'ai' && opts.provider === 'anthropic' && !apiKey) {
    console.error(chalk.red('  ✖  Anthropic engine requires ANTHROPIC_API_KEY'));
    console.error(chalk.yellow('     Set ANTHROPIC_API_KEY env variable, or use --api-key flag'));
    console.error(chalk.gray('     Or switch to local engine: --engine local'));
    process.exit(1);
  }
}

function exitError(err) {
  console.error('\n' + chalk.red('  Error: ') + err.message);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
}

function readStdin() {
  return new Promise((resolve, reject) => {
    if (process.stdin.isTTY) return resolve('');
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end',  () => resolve(data));
    process.stdin.on('error', reject);
  });
}

main();
