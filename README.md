# Chatbot App Authorer

The Chatbot App Authorer learns text rules from examples. It is a [Lucian Office](https://github.com/luciangreen/lucianoffice) plug-in: it appears as a tab in [Writer](https://github.com/luciangreen/writer) when installed beside it, and opens on its own in [LucianOS](https://github.com/luciangreen/lucianos) for any text you paste.

1. Give start and finish examples of a change you want (a "text gradient"), one per line: `start => finish`.
2. **Learn rules** works out the rewrite rules:
   - It lines up each pair word by word (longest common subsequence).
   - Each changed run becomes a rule "find → replace".
   - Rules seen in several examples are counted.
   - A rule that would also fire where an example didn't change gets a word of context, so it fires only where it should.
3. The rules are shown in a table. You can edit them and switch each one on or off.
4. They are **proved on your examples**: each start, rewritten, must give its finish. Any that don't are listed.
5. Use the rules:
   - **Try** rewrites a sentence. Inside LucianOS, the desktop character says the result too, so you can watch the effect live in RetroMR.
   - **Apply to the document** makes one undoable step.
   - **Save rules** keeps them by name, also as a Lucian Office document in `Documents/Lucian Office/Rules/`. Then "apply the casual rules" works from anywhere in Writer.

Applying rules is one step recorded as `plugin:authorer`, so it can be undone on its own.

## Install

From your `lucianos` folder:

```sh
git clone https://github.com/luciangreen/lucianoffice apps/lucianoffice
git clone https://github.com/luciangreen/chatbotappauthor apps/chatbotappauthor
```

Writer finds it in `apps/chatbotappauthor` and shows its tab, and "apply the casual rules" works there. On its own it opens at `/apps/chatbotappauthor/`.

## For apps

`plugin.js` exports the plug-in `definition` and `createTool(host)`. The tool gives:

- `run(doc, name)`, which applies a saved set;
- `learn`, `save`, `ruleSet`, `applyRules`;
- `view(rerender)`, the panel.

The host is `{ api, el, settings, persist, getDoc, setDoc, say, sayDo }`.

## Tests

```sh
npm test
```

The tests cover:

- learning rules from example pairs, proving them and applying them to new text;
- keeping case, deleting words and switching persons;
- narrowing a rule with context;
- switching rules off;
- rule sets round-tripping as Office blocks;
- applying a set to a document as one undoable step;
- saving sets by name.

Later: rules used as chatbot replies, with Claude only as an optional fallback.
