// 共有の状態と、localStorage への保存/復元。
// state と canvas は「同じ実体」を各モジュールで import して共有する。
import { SETS, ALL_CHARS, STORAGE_KEY, parseFreeChars } from './data.js';

export var $ = function (id) { return document.getElementById(id); };
export var canvas = $('canvas');

export var state = {
  tiles: [], nextId: 1, nextZ: 1, selectedId: null,
  drawCount: 6, ensureAll: false, randoms: [],
  hitomoji: true, charset: 'sixfonia', customText: ''
};

// ドラッグ/ピンチ中フラグ。canvas.js が書き、main.js の resize が読む共有フラグ。
export var flags = { isDragging: false };

// スライダーは input のたびに発火するので、保存はまとめて行う
var saveTimer = null;
export function saveSoon() {
  if (saveTimer) return;
  saveTimer = setTimeout(function () { saveTimer = null; save(); }, 300);
}

export function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      tiles: state.tiles, nextId: state.nextId, nextZ: state.nextZ,
      drawCount: state.drawCount, ensureAll: state.ensureAll, hitomoji: state.hitomoji,
      charset: state.charset, customText: state.customText
    }));
  } catch (e) { /* プライベートモード等では保存しない */ }
}

export function load() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    var d = JSON.parse(raw);
    if (!d || !Array.isArray(d.tiles) || !d.tiles.length) return false;
    state.charset = (SETS[d.charset] || d.charset === 'free') ? d.charset : 'sixfonia';
    state.customText = typeof d.customText === 'string' ? d.customText : '';
    // 自由入力の文字は SETS に無いので、そのぶんも許容リストに足してから検証する
    var allowed = ALL_CHARS.concat(parseFreeChars(state.customText));
    state.tiles = d.tiles.filter(function (t) { return allowed.indexOf(t.char) >= 0; });
    state.tiles.forEach(function (t) { if (t.opacity == null) t.opacity = 1; });
    if (!state.tiles.length) return false;
    state.nextId = d.nextId || state.tiles.length + 1;
    state.nextZ = d.nextZ || 1;
    state.drawCount = d.drawCount || 6;
    state.ensureAll = !!d.ensureAll;
    state.hitomoji = !!d.hitomoji;
    return true;
  } catch (e) { return false; }
}
