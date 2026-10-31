'use strict';

const assert = require('assert');
const { humanize } = require('../src/index');

async function testModes() {
  console.log('\n[Modes Test Suite: story, prose, sentence, structured]');
  console.log('──────────────────────────────────────────────────');

  const user = {
    name: 'Alice Johnson',
    age: 28,
    balance: 4250.75,
    created_at: '2024-03-15T10:30:00Z',
    is_active: true,
    tags: ['premium', 'early-adopter']
  };

  // 1. Structured mode
  const structured = await humanize(user, { mode: 'structured', format: 'plain' });
  assert.ok(structured.includes('•'), 'structured mode should use bullet points');
  assert.ok(structured.includes('Alice Johnson'));
  console.log('  ✓  structured mode produces bullet hierarchy');

  // 2. Story mode (English)
  const storyEn = await humanize(user, { mode: 'story', format: 'plain', lang: 'English' });
  assert.ok(!storyEn.includes('•'), 'story mode should not contain bullet points');
  assert.ok(storyEn.includes('story of Alice Johnson'), 'story mode should tell a story');
  assert.ok(storyEn.includes('28 years old'));
  console.log('  ✓  story mode produces narrative story in English');

  // 3. Story mode (Russian)
  const storyRu = await humanize(user, { mode: 'story', format: 'plain', lang: 'Russian' });
  assert.ok(!storyRu.includes('•'), 'story mode should not contain bullet points');
  assert.ok(storyRu.includes('история о Alice Johnson'), 'story mode should tell a story in Russian');
  assert.ok(storyRu.includes('28 лет'));
  console.log('  ✓  story mode produces narrative story in Russian');

  // 4. Prose mode
  const prose = await humanize(user, { mode: 'prose', format: 'plain', lang: 'Russian' });
  assert.ok(!prose.includes('•'), 'prose mode should not contain bullet points');
  assert.ok(prose.includes('структурированные данные'));
  console.log('  ✓  prose mode produces natural paragraphs');

  // 5. Sentence mode
  const sentence = await humanize(user, { mode: 'sentence', format: 'plain', lang: 'English' });
  assert.ok(sentence.includes('describes a record'));
  console.log('  ✓  sentence mode produces concise sentence');

  // 6. Story mode with story box format
  const storyBox = await humanize(user, { mode: 'story', format: 'story', lang: 'Russian' });
  assert.ok(storyBox.includes('━'), 'story box should have decorative border');
  assert.ok(storyBox.includes('ИСТОРИЯ ДАННЫХ'));
  assert.ok(storyBox.includes('история о Alice Johnson'));
  console.log('  ✓  story mode combined with story box format frames the narrative');

  console.log('──────────────────────────────────────────────────');
  console.log('✓ All mode tests passed!\n');
}

testModes();

