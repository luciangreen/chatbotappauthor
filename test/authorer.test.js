import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyRules, learnRules, parsePairs, proveRules, ruleSetBlocks, rulesFromBlocks, diff, tokens } from '../lib/authorer.js';
import { createTool, definition } from '../plugin.js';
import { createDocument, createPlugins, undoLastBy } from '../lib/core.js';

test('the Authorer learns rules from example pairs, proves them, and applies them to new text', () => {
  const pairs = parsePairs([
    "Hello, I am pleased to meet you. => Hi, I'm glad to meet you!",
    "Hello, I am writing to ask about the job. => Hi, I'm writing to ask about the job!",
    "I am pleased with the result. => I'm glad with the result!"
  ].join('\n'));
  assert.equal(pairs.length, 3);
  const rules = learnRules(pairs);
  assert.deepEqual(rules.map((r) => `${r.find} -> ${r.replace}`), ["I am pleased -> I'm glad", "I am -> I'm", 'Hello -> Hi', '. -> !']);
  assert.equal(rules.find((r) => r.find === 'Hello').count, 2);
  assert.ok(proveRules(rules, pairs).ok);
  assert.equal(applyRules('Hello, I am pleased to see the garden.', rules).text, "Hi, I'm glad to see the garden!");
});

test('rules keep case, delete words, and switch persons', () => {
  const pairs = parsePairs('I will go to the shop. => You will go to the shop.\nI like my dog very much. => You like your dog.');
  const rules = learnRules(pairs);
  assert.ok(proveRules(rules, pairs).ok, JSON.stringify(proveRules(rules, pairs)));
  assert.equal(applyRules('I want my book.', rules).text, 'You want your book.');
  assert.equal(applyRules('hello there', [{ find: 'hello', replace: 'Hi' }]).text, 'hi there');
  assert.equal(applyRules('Hello there', [{ find: 'hello', replace: 'hi' }]).text, 'Hi there');
});

test('a rule that would fire where an example did not change is narrowed with context', () => {
  const pairs = parsePairs('The cat sat on the mat. => The cat sat on the rug.\nThe mat dog ran. => The mat dog ran.');
  const rules = learnRules(pairs);
  assert.ok(proveRules(rules, pairs).ok, JSON.stringify(rules));
  assert.ok(rules[0].find.includes('the mat') || rules[0].find.includes('mat.'), JSON.stringify(rules));
});

test('edited rules can be switched off, and rule sets round-trip as Office blocks', () => {
  const rules = learnRules(parsePairs('good => great'));
  rules[0].on = false;
  assert.equal(applyRules('a good day', rules).text, 'a good day');
  const back = rulesFromBlocks(ruleSetBlocks(rules));
  assert.deepEqual(back.map(({ find, replace, on }) => ({ find, replace, on })), [{ find: 'good', replace: 'great', on: false }]);
  assert.deepEqual(diff(tokens('a b c'), tokens('a x c')).map((d) => d.type), ['same', 'ins', 'del', 'same']);
});

test("applying rules to a document is one step, recorded as the Authorer's, and saved sets work by name", async () => {
  const plugins = createPlugins().register(definition);
  const d = createDocument({ blocks: [{ id: 'a', type: 'paragraph', text: 'Hello, I am pleased.', html: 'Hello, I am pleased.' }, { id: 'b', type: 'heading', text: 'Hello <there>' }] });
  const rules = learnRules(parsePairs("Hello, I am pleased. => Hi, I'm glad."));
  const r = await plugins.run('authorer', d, { options: { rules, name: 'casual' } });
  assert.deepEqual(r.doc.blocks.map((b) => b.text), ["Hi, I'm glad.", 'Hi <there>']);
  assert.equal(r.doc.blocks[0].html, "Hi, I'm glad.");
  assert.equal(r.doc.blocks[1].html, undefined, 'blocks without html are left without it');
  assert.equal(undoLastBy(r.doc, 'plugin:authorer').doc.blocks[0].text, 'Hello, I am pleased.');
  const written = [];
  const settings = {};
  const tool = createTool({ api: { files: { write: async (p) => written.push(p) } }, el: () => null, settings, persist: () => {}, getDoc: () => d, setDoc: () => {}, say: () => {}, sayDo: async () => {} });
  tool.learn('good => great\nbad => poor');
  assert.equal(await tool.save('Upbeat'), 'upbeat');
  assert.deepEqual(written, ['Documents/Lucian Office/Rules/upbeat.rules.office.json']);
  const day = createDocument({ blocks: [{ id: 'x', type: 'paragraph', text: 'A good day, a bad night.' }] });
  assert.equal((await tool.run(day, 'upbeat')).doc.blocks[0].text, 'A great day, a poor night.');
  assert.match((await tool.run(day, 'formal')).say, /don't have rules called formal/);
});
