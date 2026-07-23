// エントリポイント。UIの配線（イベント）と起動処理をまとめる。
import { STROKES, VARIANTS } from './data.js';
import { state, $, canvas, flags, save, saveSoon, load } from './store.js';
import { draw, undoDraw, chars, refreshRandoms } from './gacha.js';
import {
  renderAll, renderCanvas, renderControls, renderSuggest, selected,
  placeTile, unplaceTile, clampPos
} from './canvas.js';

// ---------- 枚数（スライダー ⇄ 数値欄） ----------
// スライダーと数値欄で枚数を相互同期する。6〜24にクランプ。
function setDrawCount(v, opts) {
  var min = parseInt($('draw-count').min, 10), max = parseInt($('draw-count').max, 10);
  var n = parseInt(v, 10);
  if (isNaN(n)) n = state.drawCount;
  n = Math.max(min, Math.min(max, n));
  state.drawCount = n;
  $('draw-count').value = n;
  if (!opts || !opts.keepNumberField) $('draw-count-num').value = n;
  save();
}
$('draw-count').addEventListener('input', function () { setDrawCount(this.value); });
// 入力途中は数値欄の見た目を触らず、確定時（change/Enter）にクランプを反映する
$('draw-count-num').addEventListener('input', function () { setDrawCount(this.value, { keepNumberField: true }); });
$('draw-count-num').addEventListener('change', function () { setDrawCount(this.value); });
$('draw-count-num').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { setDrawCount(this.value); draw(); } });
$('ensure-all').addEventListener('change', function () { state.ensureAll = this.checked; save(); });

// ---------- 文字セット ----------
// 文字セットの表示を現在の選択に合わせる
function syncCharsetUI() {
  var list = chars();
  var n = list.length;
  var free = state.charset === 'free';

  $('ensure-all-label').textContent = n + '種すべて最低1枚';
  // 種類が引く枚数の上限を超えるセットでは「全種そろえる」が成立しない
  $('ensure-all-field').style.display =
    (n >= 1 && n <= parseInt($('draw-count').max, 10)) ? '' : 'none';
  $('free-row').style.display = free ? '' : 'none';
  $('btn-draw').disabled = !n;

  if (free) {
    // 人文字にできない文字（濁音・漢字・英字など）は普通の文字で表示される
    var noArt = list.filter(function (c) { return !STROKES[c]; });
    $('free-info').textContent = !n
      ? '文字を入れてください'
      : n + '文字で引きます' + (noArt.length ? ' / 人文字にできない字: ' + noArt.join('') : '');
  }
}

Array.prototype.slice.call(document.querySelectorAll('input[name=charset]')).forEach(function (r) {
  r.addEventListener('change', function () {
    if (!this.checked) return;
    state.charset = this.value;
    syncCharsetUI();
    if (state.charset === 'free') $('free-chars').focus();
    draw();            // 字種が混ざらないよう手札は引き直す（「引く前に戻す」で戻れる）
  });
});

$('free-chars').addEventListener('input', function () {
  state.customText = this.value;
  syncCharsetUI();
  save();
});
// 入力中のEnterで引けるようにする
$('free-chars').addEventListener('keydown', function (ev) {
  if (ev.key === 'Enter') { ev.preventDefault(); draw(); }
});

// ---------- ガチャ・手札まわりのボタン ----------
$('opt-hitomoji').addEventListener('change', function () {
  state.hitomoji = this.checked;
  renderCanvas();
  save();
});
$('btn-draw').addEventListener('click', draw);
$('btn-undo').addEventListener('click', undoDraw);
$('btn-shuffle-words').addEventListener('click', function () { refreshRandoms(); renderSuggest(); });

$('btn-place-all').addEventListener('click', function () {
  state.tiles.forEach(function (t) { placeTile(t); });
  state.selectedId = null;
  renderAll();
});
$('btn-clear').addEventListener('click', function () {
  state.tiles.forEach(unplaceTile);
  renderAll();
});
$('btn-reset-transform').addEventListener('click', function () {
  state.tiles.forEach(function (t) { t.rot = 0; t.scale = 1; t.flipped = false; t.opacity = 1; });
  renderAll();
});

// 何もないところをタップしたら選択解除
canvas.addEventListener('pointerdown', function (ev) {
  if (ev.target === canvas || ev.target.id === 'canvas-placeholder') {
    state.selectedId = null;
    renderCanvas();
    renderControls();
  }
});

// ---------- 選択タイルのコントロール ----------
function withSelected(fn) {
  return function () { var t = selected(); if (!t) return; fn(t); renderCanvas(); renderControls(); saveSoon(); };
}
$('ctl-rot').addEventListener('input', withSelected(function (t) { t.rot = parseInt($('ctl-rot').value, 10); }));
$('ctl-rot-m15').addEventListener('click', withSelected(function (t) { t.rot = (t.rot + 345) % 360; }));
$('ctl-rot-p15').addEventListener('click', withSelected(function (t) { t.rot = (t.rot + 15) % 360; }));
$('ctl-rot-p90').addEventListener('click', withSelected(function (t) { t.rot = (t.rot + 90) % 360; }));
$('ctl-scale').addEventListener('input', withSelected(function (t) { t.scale = parseFloat($('ctl-scale').value); }));
$('ctl-opacity').addEventListener('input', withSelected(function (t) { t.opacity = parseFloat($('ctl-opacity').value); }));
$('ctl-flip').addEventListener('click', withSelected(function (t) { t.flipped = !t.flipped; }));
$('ctl-front').addEventListener('click', withSelected(function (t) { t.z = state.nextZ++; }));
$('ctl-back').addEventListener('click', withSelected(function (t) {
  var min = Math.min.apply(null, state.tiles.filter(function (x) { return x.placed; }).map(function (x) { return x.z; }));
  t.z = min - 1;
}));
$('ctl-variant').addEventListener('click', withSelected(function (t) {
  if (VARIANTS[t.char]) t.variant = t.variant === 0 ? 1 : 0;
}));
$('ctl-remove').addEventListener('click', function () {
  var t = selected(); if (!t) return;
  unplaceTile(t);
  renderAll();
});

// ---------- キーボード ----------
document.addEventListener('keydown', function (ev) {
  var tag = (ev.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea') return;
  var t = selected();
  if (!t) return;
  var step = ev.shiftKey ? 10 : 2;
  if (ev.key === 'r' || ev.key === 'R') { t.rot = (t.rot + 90) % 360; }
  else if (ev.key === 'ArrowLeft')  { t.x -= step; }
  else if (ev.key === 'ArrowRight') { t.x += step; }
  else if (ev.key === 'ArrowUp')    { t.y -= step; }
  else if (ev.key === 'ArrowDown')  { t.y += step; }
  else if (ev.key === 'Delete' || ev.key === 'Backspace') { unplaceTile(t); renderAll(); ev.preventDefault(); return; }
  else return;
  ev.preventDefault();
  clampPos(t);
  renderCanvas();
  renderControls();
  save();
});

// ドラッグ/ピンチ中に再描画するとキャプチャ中の要素ごと差し替わり、掴んだまま固まるので避ける
window.addEventListener('resize', function () { if (!flags.isDragging) renderCanvas(); });

// ---------- 起動 ----------
if (!load()) {
  state.tiles = [];
} else {
  refreshRandoms();
}
$('draw-count').value = state.drawCount;
$('draw-count-num').value = state.drawCount;
$('ensure-all').checked = state.ensureAll;
$('opt-hitomoji').checked = state.hitomoji;
$('free-chars').value = state.customText;
var radio = document.querySelector('input[name=charset][value="' + state.charset + '"]');
if (radio) radio.checked = true;
syncCharsetUI();
renderAll();
