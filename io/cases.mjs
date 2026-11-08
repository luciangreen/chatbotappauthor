// The functions whose inputs and outputs are recorded in io/ios.txt (see io/engine.mjs).
import { diff, learnRules, applyRules, proveRules, parsePairs } from '../lib/authorer.js';

export const title = 'Chatbot App Authorer';

const swaps = [['happy', 'glad'], ['teacher', 'tutor'], ['book', 'volume'], ['runs', 'jogs'], ['green', 'emerald']];
const pairOf = (rnd, rule) => { const s = `${rnd.words(1, 3)} ${rule[0]} ${rnd.words(1, 3)}`; return [s, s.replace(rule[0], rule[1])]; };

export const cases = [
  { name: 'diff', run: diff, make: (rnd) => pairOf(rnd, rnd.pick(swaps)) },
  { name: 'learnRules', run: learnRules, make: (rnd) => { const r = rnd.pick(swaps); return [Array.from({ length: rnd.int(1, 3) }, () => pairOf(rnd, rnd.chance(0.8) ? r : rnd.pick(swaps)))]; } },
  { name: 'learn then apply', run: (pairs, text) => applyRules(text, learnRules(pairs)), make: (rnd) => { const r = rnd.pick(swaps); return [[pairOf(rnd, r)], `${rnd.words(1, 4)} ${rnd.chance(0.7) ? r[0] : 'nothing'} ${rnd.words(0, 3)}`]; } },
  { name: 'proveRules', run: (pairs) => proveRules(learnRules(pairs), pairs), make: (rnd) => [Array.from({ length: rnd.int(1, 3) }, () => pairOf(rnd, rnd.pick(swaps)))] },
  { name: 'parsePairs', run: parsePairs, make: (rnd) => [Array.from({ length: rnd.int(1, 3) }, () => { const [a, b] = pairOf(rnd, rnd.pick(swaps)); return rnd.pick([`${a} -> ${b}`, `${a}\t${b}`, `${a} => ${b}`]); }).join('\n')] }
];
