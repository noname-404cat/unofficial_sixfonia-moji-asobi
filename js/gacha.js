// ガチャ（引く / 戻す）と、手札からの語ランダム生成。DOM は直接触らず state を更新する。
import { SETS, parseFreeChars, shuffle, tokenize, NG } from './data.js';
import { state, $ } from './store.js';
import { renderAll } from './canvas.js';

export function chars() {
  return state.charset === 'free' ? parseFreeChars(state.customText) : SETS[state.charset].chars;
}

function randChar() { var c = chars(); return c[Math.floor(Math.random() * c.length)]; }

export function newTile(c) {
  return { id: state.nextId++, char: c, placed: false, x: 0, y: 0, rot: 0, scale: 1, flipped: false, z: 0, variant: 0, opacity: 1 };
}

var undoSnapshot = null;

export function draw() {
  if (!chars().length) { renderAll(); return; }   // 自由入力が空のときは引けない
  undoSnapshot = JSON.stringify(state);
  $('btn-undo').disabled = false;

  var n = state.drawCount;
  var picked = [];
  if (state.ensureAll && chars().length <= n) {
    picked = chars().slice();                     // 全種を1枚ずつ確保
    while (picked.length < n) picked.push(randChar());
    shuffle(picked);
  } else {
    for (var i = 0; i < n; i++) picked.push(randChar());
  }

  state.tiles = picked.map(function (c) { return newTile(c); });
  state.nextId = state.tiles.length + 1;
  state.nextZ = 1;
  state.selectedId = null;
  refreshRandoms();
  renderAll();
}

export function undoDraw() {
  if (!undoSnapshot) return;
  var prev = JSON.parse(undoSnapshot);
  undoSnapshot = null;
  $('btn-undo').disabled = true;
  state.tiles = prev.tiles;
  state.nextId = prev.nextId;
  state.nextZ = prev.nextZ;
  state.selectedId = prev.selectedId;
  refreshRandoms();
  renderAll();
}

// 手札の文字だけを使って、並びをランダムに作る（意味のない造語もアリ）
export function buildRandoms(n) {
  var pool = state.tiles.map(function (t) { return t.char; });
  if (pool.length < 2) return [];

  var out = [], seen = {}, tries = 0;
  while (out.length < n && tries < n * 40) {
    tries++;
    var bag = pool.slice();
    shuffle(bag);
    var maxLen = Math.min(5, bag.length);
    var len = 2 + Math.floor(Math.random() * (maxLen - 1));
    var picked = bag.slice(0, len);

    var w = picked.map(function (c, i) {
      // たまに小書き・漢数字の字形で見せる（オ→ォ、ニ→二）
      if (i > 0 && c === 'オ' && Math.random() < 0.5) return 'ォ';
      if (c === 'ニ' && Math.random() < 0.25) return '二';
      return c;
    }).join('');

    var key = tokenize(w).join('');
    if (seen[key]) continue;
    var ng = NG.some(function (x) { return key.indexOf(x) >= 0; });
    if (ng) continue;
    seen[key] = true;
    out.push({ w: w, tokens: tokenize(w) });
  }
  return out;
}

export function refreshRandoms() { state.randoms = buildRandoms(12); }
