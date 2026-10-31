'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('\n[Browser Extension & UI Integrity Audit]');
console.log('──────────────────────────────────────────────────');

let passed = 0;
let failed = 0;

async function test(title, fn) {
  try {
    await fn();
    console.log(`  ✓  ${title}`);
    passed++;
  } catch (err) {
    console.error(`  ✖  ${title}: ${err.message}`);
    failed++;
  }
}

async function runAll() {
  await test('manifest.json is valid Manifest V3', () => {
    const raw = fs.readFileSync(path.join(__dirname, '../extension/manifest.json'), 'utf8');
    const manifest = JSON.parse(raw);
    assert.strictEqual(manifest.manifest_version, 3);
    assert.ok(manifest.name.includes('json-humanized'));
    assert.ok(manifest.action && manifest.action.default_popup === 'popup.html');
    assert.ok(manifest.background && manifest.background.service_worker === 'background.js');
    assert.ok(Array.isArray(manifest.content_scripts));
  });

  await test('extension icons exist and have valid PNG signatures', () => {
    const sizes = [16, 48, 128];
    const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    for (const s of sizes) {
      const iconPath = path.join(__dirname, `../extension/icons/icon-${s}.png`);
      assert.ok(fs.existsSync(iconPath), `icon-${s}.png must exist`);
      const buf = fs.readFileSync(iconPath);
      assert.ok(buf.length > 50, `icon-${s}.png must be non-empty`);
      assert.ok(buf.subarray(0, 8).equals(pngSig), `icon-${s}.png must have PNG header`);
    }

    const svgPath = path.join(__dirname, '../extension/icons/icon.svg');
    assert.ok(fs.existsSync(svgPath));
    const svg = fs.readFileSync(svgPath, 'utf8');
    assert.ok(svg.includes('<svg') && svg.includes('circle'));
  });

  await test('docs/icon.svg exists and is valid SVG', () => {
    const svgPath = path.join(__dirname, '../docs/icon.svg');
    assert.ok(fs.existsSync(svgPath));
    const svg = fs.readFileSync(svgPath, 'utf8');
    assert.ok(svg.includes('<svg') && svg.includes('circle'));
  });

  await test('extension/engine.js runs standalone with English & Russian', () => {
    const jsYamlCode = fs.readFileSync(path.join(__dirname, '../extension/lib/js-yaml.min.js'), 'utf8');
    const engineCode = fs.readFileSync(path.join(__dirname, '../extension/engine.js'), 'utf8');

    const context = {
      console,
      window: {},
      navigator: { language: 'en-US' }
    };
    vm.createContext(context);
    vm.runInContext(jsYamlCode, context);
    vm.runInContext(engineCode, context);

    assert.strictEqual(typeof context.humanizeEngine, 'function');
    assert.strictEqual(typeof context.diffBrowserData, 'function');
    assert.strictEqual(typeof context.parseBrowserData, 'function');

    const testData = { name: 'Alice', age: 30, is_active: true };
    const enRes = context.humanizeEngine(testData, 'json', 'plain', 'structured', 'en');
    assert.ok(enRes.includes('Alice'));
    assert.ok(enRes.includes('30 years old'));

    const ruRes = context.humanizeEngine(testData, 'json', 'plain', 'structured', 'ru');
    assert.ok(ruRes.includes('Alice'));
    assert.ok(ruRes.includes('30 лет'));

    // Story mode check
    const storyRu = context.humanizeEngine(testData, 'json', 'plain', 'story', 'ru');
    assert.ok(storyRu.includes('история'), 'Story mode in Russian should contain история');
    assert.ok(!storyRu.includes('•'), 'Story mode should not use bullet points');

    const storyEn = context.humanizeEngine(testData, 'json', 'plain', 'story', 'en');
    assert.ok(storyEn.includes('story'), 'Story mode in English should contain story');
    assert.ok(!storyEn.includes('•'), 'Story mode should not use bullet points');

    // Prose mode check
    const proseRu = context.humanizeEngine(testData, 'json', 'plain', 'prose', 'ru');
    assert.ok(!proseRu.includes('•'), 'Prose mode should not use bullet points');

    const before = { status: 'pending', count: 1 };
    const after = { status: 'active', count: 2, role: 'admin' };
    const diffRes = context.diffBrowserData(before, after, 'ru');
    assert.ok(diffRes.includes('статус'));
    assert.ok(diffRes.includes('Добавлено'));
  });

  await test('popup.html and popup.js have full drag & drop on all inputs', () => {
    const html = fs.readFileSync(path.join(__dirname, '../extension/popup.html'), 'utf8');
    const js = fs.readFileSync(path.join(__dirname, '../extension/popup.js'), 'utf8');
    const css = fs.readFileSync(path.join(__dirname, '../extension/popup.css'), 'utf8');

    assert.ok(html.includes('id="input-text"'));
    assert.ok(html.includes('id="diff-a"'));
    assert.ok(html.includes('id="diff-b"'));
    assert.ok(html.includes('id="btn-prettify"'));
    assert.ok(html.includes('id="btn-clear"'));
    assert.ok(html.includes('id="btn-diff-sample"'));
    assert.ok(html.includes('value="story"'));
    assert.ok(html.includes('id="popup-stats"'));

    assert.ok(js.includes('bindDropZone'));
    assert.ok(js.includes('diffA'));
    assert.ok(js.includes('diffB'));
    assert.ok(js.includes('btn-prettify'));
    assert.ok(js.includes('btn-clear'));
    assert.ok(js.includes('btn-diff-sample'));

    assert.ok(css.includes('textarea.dragover'));
  });

  await test('docs/index.html has drag & drop on input and both diff panes', () => {
    const html = fs.readFileSync(path.join(__dirname, '../docs/index.html'), 'utf8');

    assert.ok(html.includes('id="input"'));
    assert.ok(html.includes('id="diff-in-a"'));
    assert.ok(html.includes('id="diff-in-b"'));
    assert.ok(html.includes('btn-prettify-doc'));
    assert.ok(html.includes('btn-clear-doc'));
    assert.ok(html.includes('loadSampleDiff'));
    assert.ok(html.includes('dataToStory'));
    assert.ok(html.includes('id="s-words"'));
    assert.ok(html.includes('bindDropZone'));
    assert.ok(html.includes('textarea.dragover'));
  });

  await test('vscode-extension package.json and extension.js are valid', () => {
    const pkgRaw = fs.readFileSync(path.join(__dirname, '../vscode-extension/package.json'), 'utf8');
    const pkg = JSON.parse(pkgRaw);
    assert.ok(pkg.name.includes('json-humanized'));
    assert.ok(Array.isArray(pkg.contributes.commands));
    assert.ok(pkg.contributes.commands.length >= 2);

    const js = fs.readFileSync(path.join(__dirname, '../vscode-extension/extension.js'), 'utf8');
    assert.ok(js.includes('activate'));
    assert.ok(js.includes('deactivate'));
  });

  await test('desktop 1-click launchers exist', () => {
    assert.ok(fs.existsSync(path.join(__dirname, '../start-ui.bat')));
    assert.ok(fs.existsSync(path.join(__dirname, '../start-ui.sh')));
    assert.ok(fs.existsSync(path.join(__dirname, '../push-to-github.bat')));
    assert.ok(fs.existsSync(path.join(__dirname, '../ИНСТРУКЦИЯ.md')));
  });

  await test('src/server.js handles health, humanize, and diff endpoints', async () => {
    const { EventEmitter } = require('events');
    const { createRequestHandler } = require('../src/server');
    const handler = createRequestHandler();

    // 1. Health check
    const reqHealth = new EventEmitter();
    reqHealth.url = '/api/health';
    reqHealth.method = 'GET';
    reqHealth.headers = { host: 'localhost' };

    let healthStatus = 0;
    let healthData = '';
    const resHealth = {
      writeHead: (status) => { healthStatus = status; },
      end: (data) => { healthData = data; }
    };
    await handler(reqHealth, resHealth);
    assert.strictEqual(healthStatus, 200);
    assert.ok(JSON.parse(healthData).status === 'ok');

    // 2. Humanize check
    const reqHum = new EventEmitter();
    reqHum.url = '/api/humanize';
    reqHum.method = 'POST';
    reqHum.headers = { host: 'localhost' };

    let humStatus = 0;
    let humData = '';
    await new Promise((resolve) => {
      const resHum = {
        writeHead: (status) => { humStatus = status; },
        end: (data) => { humData = data; resolve(); }
      };
      handler(reqHum, resHum);
      process.nextTick(() => {
        reqHum.emit('data', JSON.stringify({ text: '{"status": "active", "count": 5}', lang: 'ru' }));
        reqHum.emit('end');
      });
    });
    assert.strictEqual(humStatus, 200);
    assert.ok(JSON.parse(humData).success === true);
  });

  console.log('──────────────────────────────────────────────────');
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('✓ All extension & UI verification checks passed!\n');
  }
}

runAll();
