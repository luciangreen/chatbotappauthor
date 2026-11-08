// The Chatbot App Authorer as a Lucian Office plug-in: it rewrites a document's text blocks
// with a set of rules as one undoable step (plugin:authorer), and its panel for an app.
// Writer loads this from apps/chatbotappauthor when it is installed; index.html uses it alone.
//
// The app hands over a host:
//   { api, el, settings, persist(), getDoc(), setDoc(doc), say(text), sayDo(text), serialise, createDocument }
// settings holds examples (the start => finish lines) and ruleSets ({ name: blocks }).
import { createPlugins, createDocument as makeDoc, serialise as ser } from './lib/core.js';
import { applyRules, learnRules, parsePairs, proveRules, ruleSetBlocks, rulesFromBlocks } from './lib/authorer.js';

export const ID = 'authorer';
const escapeHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const definition = {
  id: ID, name: 'Chatbot App Authorer', apps: ['writer'],
  run: ({ doc, options }) => {
    const ops = [];
    let n = 0;
    for (const b of doc.blocks.filter((x) => x.type !== 'description' && !x.deleted && typeof x.text === 'string')) {
      const r = applyRules(b.text, options.rules);
      if (r.count) { n += r.count; ops.push({ op: 'set', id: b.id, key: 'text', value: r.text }); if (b.html !== undefined) ops.push({ op: 'set', id: b.id, key: 'html', value: escapeHtml(r.text) }); }
    }
    return { ops, label: `applied ${options.name}`, say: n ? `Applied ${options.name}: ${n} change${n === 1 ? '' : 's'}.` : `${options.name} found nothing to change.` };
  }
};
export { applyRules };

export function createTool(host) {
  const { api, el } = host;
  const s = host.settings;
  s.examples ??= '';
  s.ruleSets ??= {};
  const plugins = createPlugins().register(definition);
  const serialise = host.serialise ?? ser;
  const createDocument = host.createDocument ?? makeDoc;
  let learned = null;

  const ruleSet = (name) => (s.ruleSets[String(name).toLowerCase()] ? rulesFromBlocks(s.ruleSets[String(name).toLowerCase()]) : null);
  async function applySet(doc, rules, name) {
    return plugins.run(ID, doc, { options: { rules, name } });
  }
  // "apply the casual rules": { doc, say }
  async function run(doc, name) {
    const rules = ruleSet(name);
    if (!rules) return { doc, say: `I don't have rules called ${name}.` };
    return applySet(doc, rules, `the ${name} rules`);
  }
  function learn(text) { s.examples = text; host.persist(); learned = learnRules(parsePairs(text)); return learned; }
  async function save(name) {
    const n = String(name).trim().toLowerCase();
    if (!n || !learned) return null;
    s.ruleSets[n] = ruleSetBlocks(learned);
    host.persist();
    // also kept in Lucian Office as a document of its own
    const set = createDocument({ app: 'authorer', title: n, blocks: ruleSetBlocks(learned), data: { examples: s.examples } });
    await api.files.write(`Documents/Lucian Office/Rules/${n}.rules.office.json`, serialise(set), { mkdirs: true, force: true }).catch(() => {});
    return n;
  }

  function view(rerender) {
    const examples = el('textarea', { rows: 6, value: s.examples, placeholder: 'One example per line: start => finish\nHello, I am pleased to meet you. => Hi, I\'m glad to meet you!', onchange: (e) => { s.examples = e.target.value; host.persist(); } });
    const out = el('div');
    const trial = el('input', { type: 'text', placeholder: 'Try the rules on a sentence' });
    const trialOut = el('p', { className: 'quiet', 'aria-live': 'polite' });
    const name = el('input', { type: 'text', placeholder: 'name, e.g. casual' });
    const showRules = () => {
      out.replaceChildren();
      if (!learned) return;
      const pairs = parsePairs(s.examples);
      const proof = proveRules(learned, pairs);
      out.append(el('p', { className: proof.ok ? 'ok' : 'bad' }, proof.ok ? `Proved on all ${proof.total} examples ✓` : `${proof.passed} of ${proof.total} examples come out right.`));
      out.append(el('table', { className: 'rules' }, el('tr', {}, el('th', {}, 'On'), el('th', {}, 'Find'), el('th', {}, 'Replace'), el('th', {}, 'Seen')),
        learned.map((r) => el('tr', {},
          el('td', {}, el('input', { type: 'checkbox', checked: r.on, onchange: (e) => { r.on = e.target.checked; showRules(); } })),
          el('td', {}, el('input', { type: 'text', value: r.find, onchange: (e) => { r.find = e.target.value; showRules(); } })),
          el('td', {}, el('input', { type: 'text', value: r.replace, onchange: (e) => { r.replace = e.target.value; showRules(); } })),
          el('td', {}, String(r.count ?? 1))))));
      const bad = proof.results.filter((x) => !x.ok);
      if (bad.length) out.append(el('ul', {}, bad.map((x) => el('li', { className: 'bad' }, `"${x.start}" gives "${x.got}", not "${x.finish}"`))));
    };
    showRules();
    const saved = Object.keys(s.ruleSets);
    return el('div', {},
      el('p', { className: 'quiet' }, 'Give start and finish examples of a change you want (a "text gradient"). The rules are worked out from them, shown here to edit, and proved on the examples.'),
      examples,
      el('div', { className: 'row' }, el('button', { className: 'primary', textContent: 'Learn rules', onclick: () => { learn(examples.value); showRules(); } })),
      out,
      el('form', { className: 'row', onsubmit: (e) => {
        e.preventDefault();
        if (!learned) return;
        const r = applyRules(trial.value, learned);
        trialOut.textContent = r.text;
        if (parent !== window) parent.postMessage({ type: 'lucianos.say', text: r.text }, location.origin); // watch it in RetroMR
      } }, trial, el('button', { textContent: 'Try' })),
      trialOut,
      el('div', { className: 'row' },
        el('button', { textContent: 'Apply to the document', disabled: !learned, onclick: async () => { const r = await applySet(host.getDoc(), learned, 'learned rules'); host.setDoc(r.doc); host.say(r.say); } })),
      el('div', { className: 'row' },
        name,
        el('button', { textContent: 'Save rules', disabled: !learned, onclick: async () => {
          const n = await save(name.value);
          if (!n) return name.focus();
          host.say(`Saved the ${n} rules. Say "apply the ${n} rules".`);
          rerender();
        } })),
      saved.length ? el('div', {}, el('h3', {}, 'Saved rules'), el('ul', {}, saved.map((n) => el('li', {}, `${n} (${s.ruleSets[n].length} rules) `,
        el('button', { className: 'small', textContent: 'Apply', onclick: () => host.sayDo(`apply the ${n} rules`) }),
        el('button', { className: 'small', textContent: 'Edit', onclick: () => { learned = rulesFromBlocks(s.ruleSets[n]); name.value = n; showRules(); } }))))) : null);
  }

  return { id: ID, name: 'Authorer', run, ruleSet, learn, save, applySet, view, applyRules };
}

export const CSS = `table.rules{border-collapse:collapse;width:100%}table.rules td,table.rules th{border:1px solid #8884;padding:2px 4px;text-align:left}table.rules input[type=text]{width:100%;box-sizing:border-box;border:0;background:transparent;font:inherit}`;
