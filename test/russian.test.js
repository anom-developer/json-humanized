'use strict';

const { humanize, humanizeString } = require('../src/index');
const { diff } = require('../src/diff');
const { humanizeKey, humanizeValue } = require('../src/humanizer');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertContains(str, substr, message) {
  assert(
    str && str.includes(substr),
    message || `Expected "${str}" to contain "${substr}"`
  );
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗  ${name}: ${err.message}`);
    failed++;
  }
}

async function run() {
  console.log('\n[Russian Language Support]');

  await test('humanizes object fields in Russian', async () => {
    const r = await humanize({
      name: 'Алексей',
      age: 28,
      balance: 1500000,
      is_active: true,
      password: 'secretpassword',
      email: 'alex@example.com'
    }, { lang: 'ru' });

    assertContains(r, 'структурированный объект из 6 полей');
    assertContains(r, 'Имя: Алексей');
    assertContains(r, '28 лет');
    assertContains(r, 'Баланс: $1.50M');
    assertContains(r, 'Активен: да (активен включен(о))');
    assertContains(r, '*** (скрыто в целях безопасности)');
    assertContains(r, 'эл. почта: alex@example.com');
  });

  await test('pluralRu handles Russian numerals correctly', async () => {
    assertContains(humanizeValue(1, 'age', 0, 'ru'), '1 год');
    assertContains(humanizeValue(2, 'age', 0, 'ru'), '2 года');
    assertContains(humanizeValue(5, 'age', 0, 'ru'), '5 лет');
    assertContains(humanizeValue(21, 'age', 0, 'ru'), '21 год');
    assertContains(humanizeValue(24, 'age', 0, 'ru'), '24 года');
    assertContains(humanizeValue(25, 'age', 0, 'ru'), '25 лет');
  });

  await test('humanizes array of records in Russian', async () => {
    const r = await humanize([
      { name: 'Сергей', role: 'Администратор' },
      { name: 'Мария', role: 'Пользователь' }
    ], { lang: 'ru' });

    assertContains(r, 'список из 2 записей');
    assertContains(r, 'Запись 1');
    assertContains(r, 'Запись 2');
  });

  await test('humanizes diff in Russian', async () => {
    const r = await diff(
      { status: 'pending', count: 5 },
      { status: 'active', count: 10, new_field: 'ok' },
      { lang: 'ru' }
    );

    assertContains(r, 'Добавлено');
    assertContains(r, 'Изменено');
  });

  console.log('─'.repeat(40));
  console.log(`Russian tests: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run();
