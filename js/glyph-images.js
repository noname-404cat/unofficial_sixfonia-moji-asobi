// 画像版ページ用：1文字＝1枚の完成画像を読み込む。ない字は座標から描く（hitomoji.js 側のフォールバック）。
// 画像は img/glyphs/<名前>.svg（なければ .png）。描画枠いっぱいの正方形で、SVG は width/height 属性を付けること。
import { ALL_CHARS } from './data.js';

// 文字 -> ファイル名（拡張子なし）
export var GLYPH_NAMES = {
  'ア': 'a', 'イ': 'i', 'ウ': 'u', 'エ': 'e', 'オ': 'o',
  'カ': 'ka', 'キ': 'ki', 'ク': 'ku', 'ケ': 'ke', 'コ': 'ko',
  'サ': 'sa', 'シ': 'shi', 'ス': 'su', 'セ': 'se', 'ソ': 'so',
  'タ': 'ta', 'チ': 'chi', 'ツ': 'tsu', 'テ': 'te', 'ト': 'to',
  'ナ': 'na', 'ニ': 'ni', 'ヌ': 'nu', 'ネ': 'ne', 'ノ': 'no',
  'ハ': 'ha', 'ヒ': 'hi', 'フ': 'fu', 'ヘ': 'he', 'ホ': 'ho',
  'マ': 'ma', 'ミ': 'mi', 'ム': 'mu', 'メ': 'me', 'モ': 'mo',
  'ヤ': 'ya', 'ユ': 'yu', 'ヨ': 'yo',
  'ラ': 'ra', 'リ': 'ri', 'ル': 'ru', 'レ': 're', 'ロ': 'ro',
  'ワ': 'wa', 'ヲ': 'wo', 'ン': 'n',
  '!?': 'mark_bang_question',
  'ォ': 'o_small', '二': 'ni_kanji'
};

function loadImage(src) {
  return new Promise(function (resolve) {
    var img = new Image();
    img.onload = function () { resolve(img); };
    img.onerror = function () { resolve(null); };
    img.src = src;
  });
}

// 全画像を先読みして { 文字: Image } を返す（見つからない字は含めない）
export function loadGlyphImages(dir) {
  var chars = Object.keys(GLYPH_NAMES);
  return Promise.all(chars.map(function (ch) {
    var base = dir + GLYPH_NAMES[ch];
    return loadImage(base + '.svg').then(function (img) { return img || loadImage(base + '.png'); });
  })).then(function (imgs) {
    var map = {};
    chars.forEach(function (ch, i) { if (imgs[i]) map[ch] = imgs[i]; });
    return map;
  });
}
