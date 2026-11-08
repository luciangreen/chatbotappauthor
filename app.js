// The Chatbot App Authorer on its own: learn rewrite rules from examples, prove them, and
// apply them to a text you paste.
import { api } from '/shared/api.js';
import { characterHandler, createCommands, createDocument, serialise } from './lib/core.js';
import { CSS, createTool } from './plugin.js';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) n.append(k.nodeType ? k : document.createTextNode(String(k)));
  return n;
};
document.head.append(el('style', { textContent: CSS }));

const settings = {};
const docOf = () => createDocument({ app: 'chatbotappauthor', blocks: $('text').value.split(/\n{2,}/).map((text, i) => ({ id: `p${i}`, type: 'paragraph', text })) });
const host = {
  api, el, settings, serialise, createDocument,
  persist: () => api.state.set('chatbotappauthor', settings).catch(() => {}),
  getDoc: docOf,
  setDoc: (d) => { $('added').replaceChildren(el('pre', { style: 'white-space:pre-wrap', textContent: d.blocks.map((b) => b.text).join('\n\n') })); $('text').value = d.blocks.map((b) => b.text).join('\n\n'); },
  say: (t) => { $('reply').textContent = t; },
  sayDo: async (t) => { const r = await handle({ intent: 'unknown', text: t }, t); host.say(r ?? commands.help()); return r; }
};
let tool;
const commands = createCommands({ app: 'Authorer' }).register({ name: 'apply rules', patterns: ['apply [the] {name} rules', 'use [the] {name} rules'], help: 'apply the casual rules', run: async ({ args, doc }) => tool.run(doc, args.name) });
const handle = characterHandler(commands, docOf, (d) => host.setDoc(d));
addEventListener('message', async (e) => {
  if (e.origin !== location.origin || e.data?.type !== 'lucianos.command') return;
  const reply = await handle({ intent: 'unknown', text: e.data.text }, e.data.text);
  e.source.postMessage({ type: 'lucianos.reply', id: e.data.id, text: reply }, location.origin);
});
if (parent !== window) parent.postMessage({ type: 'lucianos.commands', names: commands.list().map((c) => c.name) }, location.origin);

async function init() {
  Object.assign(settings, (await api.state.get('chatbotappauthor').catch(() => null)) ?? {});
  tool = createTool(host);
  const draw = () => $('tool').replaceChildren(tool.view(draw));
  draw();
}
init();
