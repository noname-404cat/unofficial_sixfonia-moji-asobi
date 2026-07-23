// タイルの配置・変形・操作（ドラッグ / リサイズ / 回転 / ピンチ）と、各セクションの描画。
import { TILE, SCALE_MIN, SCALE_MAX, VARIANTS, STROKES } from './data.js';
import { hitomojiEl } from './hitomoji.js';
import { state, $, canvas, flags, save, saveSoon } from './store.js';

// ---------- タイル配置 ----------
export function canvasSize() { return { w: canvas.clientWidth, h: canvas.clientHeight }; }

export function clampPos(t) {
  var s = canvasSize();
  t.x = Math.max(0, Math.min(t.x, Math.max(0, s.w - TILE)));
  t.y = Math.max(0, Math.min(t.y, Math.max(0, s.h - TILE)));
}

export function placeTile(t) {
  if (t.placed) return;
  var s = canvasSize();
  var placedCount = state.tiles.filter(function (x) { return x.placed; }).length;
  // 中央付近から少しずつずらして積む
  t.x = s.w / 2 - TILE / 2 + (placedCount % 6) * 14 - 35;
  t.y = s.h / 2 - TILE / 2 + (Math.floor(placedCount / 6) % 4) * 14 - 21;
  t.placed = true;
  t.z = state.nextZ++;
  clampPos(t);
  state.selectedId = t.id;
}

export function unplaceTile(t) {
  t.placed = false;
  t.rot = 0; t.scale = 1; t.flipped = false; t.variant = 0; t.opacity = 1;
  if (state.selectedId === t.id) state.selectedId = null;
}

function displayChar(t) {
  var v = VARIANTS[t.char];
  return v ? v[t.variant] : t.char;
}

// ---------- 描画 ----------
function renderHand() {
  var hand = $('hand');
  hand.innerHTML = '';
  var rest = state.tiles.filter(function (t) { return !t.placed; });
  if (!rest.length) {
    var e = document.createElement('span');
    e.className = 'empty';
    e.textContent = state.tiles.length ? '手札は全部キャンバスに出ています' : '「引く」で文字を出してください';
    hand.appendChild(e);
    return;
  }
  rest.forEach(function (t) {
    var b = document.createElement('button');
    b.className = 'hand-tile' + (t.char === '!?' ? ' small-mark' : '');
    b.textContent = t.char;
    b.title = 'キャンバスに置く';
    b.addEventListener('click', function () { placeTile(t); renderAll(); });
    hand.appendChild(b);
  });
}

// 重ね順を 1..n に振り直す。
// z が負になると #canvas（stacking context を作らない position:relative）の
// 背景の裏に回り込み、タイルが見えず掴めなくなるため、毎描画で正の値に保つ。
function normalizeZ(placed) {
  placed.slice().sort(function (a, b) { return a.z - b.z; })
    .forEach(function (t, i) { t.z = i + 1; });
  state.nextZ = placed.length + 1;
}

export function renderCanvas() {
  Array.prototype.slice.call(canvas.querySelectorAll('.tile')).forEach(function (el) { el.remove(); });
  var placed = state.tiles.filter(function (t) { return t.placed; });
  normalizeZ(placed);
  $('canvas-placeholder').style.display = placed.length ? 'none' : 'grid';
  $('canvas-hint').textContent = placed.length ? placed.length + ' 枚' : '';

  placed.forEach(function (t) {
    clampPos(t);
    var el = document.createElement('div');
    el.className = 'tile' + (t.char === '!?' ? ' small-mark' : '') + (state.selectedId === t.id ? ' selected' : '');
    // 字形データが無い文字（濁音・漢字・英字など）は普通の文字で表示する
    if (state.hitomoji && STROKES[displayChar(t)]) el.appendChild(hitomojiEl(displayChar(t)));
    else el.textContent = displayChar(t);
    el.style.zIndex = String(t.z);
    if (state.selectedId === t.id) addHandles(el, t);
    applyTransform(el, t);
    el.addEventListener('pointerdown', function (ev) { onTilePointerDown(ev, t, el); });
    canvas.appendChild(el);
  });
}

function applyTransform(el, t) {
  var sx = t.flipped ? -t.scale : t.scale;
  el.style.transform = 'translate(' + t.x + 'px,' + t.y + 'px) rotate(' + t.rot + 'deg) scale(' + sx + ',' + t.scale + ')';
  el.style.opacity = String(t.opacity == null ? 1 : t.opacity);
  // ハンドルはタイルの拡大に引きずられないよう、逆数で打ち消して見た目の大きさを保つ
  var inv = 'scale(' + (1 / t.scale) * (t.flipped ? -1 : 1) + ',' + (1 / t.scale) + ')';
  Array.prototype.slice.call(el.querySelectorAll('.handle')).forEach(function (h) { h.style.transform = inv; });
}

// 選択中タイルに、拡大（右下）と回転（左上）のハンドルを付ける
function addHandles(el, t) {
  [['resize', onResizePointerDown], ['rotate', onRotatePointerDown]].forEach(function (pair) {
    var h = document.createElement('div');
    h.className = 'handle ' + pair[0];
    h.addEventListener('pointerdown', function (ev) { pair[1](ev, t, el, h); });
    el.appendChild(h);
  });
}

export function renderControls() {
  var t = selected();
  var box = $('tile-controls');
  if (!t) { box.className = ''; return; }
  box.className = 'on';
  $('ctl-rot').value = t.rot;
  $('ctl-rot-label').textContent = t.rot + '°';
  $('ctl-scale').value = t.scale;
  $('ctl-scale-label').textContent = t.scale.toFixed(1) + '×';
  var op = t.opacity == null ? 1 : t.opacity;
  $('ctl-opacity').value = op;
  $('ctl-opacity-label').textContent = Math.round(op * 100) + '%';
  var variants = VARIANTS[t.char];
  var vb = $('ctl-variant');
  vb.disabled = !variants;
  vb.textContent = variants
    ? '見立て ' + displayChar(t) + '→' + variants[t.variant === 0 ? 1 : 0]
    : '見立て';
}

export function selected() {
  var id = state.selectedId;
  if (id == null) return null;
  var t = state.tiles.filter(function (x) { return x.id === id && x.placed; })[0];
  return t || null;
}

export function renderAll() {
  renderHand();
  renderCanvas();
  renderControls();
  renderSuggest();
  save();
}

// ---------- ハンドル操作（マウス・微調整用） ----------
// 選択が変わったとき、ハンドルを選択中のタイルだけに付け替える
function attachHandle(el, t) {
  Array.prototype.slice.call(canvas.querySelectorAll('.handle')).forEach(function (x) { x.remove(); });
  addHandles(el, t);
  applyTransform(el, t);
}

// ハンドルのドラッグ共通処理。move(e) が実際の変形を行う。
function dragHandle(ev, h, move) {
  ev.preventDefault();
  ev.stopPropagation();          // タイル本体のドラッグ（移動）を起こさない
  flags.isDragging = true;
  h.setPointerCapture(ev.pointerId);
  function up() {
    flags.isDragging = false;
    h.removeEventListener('pointermove', move);
    h.removeEventListener('pointerup', up);
    h.removeEventListener('pointercancel', up);
    save();
  }
  h.addEventListener('pointermove', move);
  h.addEventListener('pointerup', up);
  h.addEventListener('pointercancel', up);
}

// 角をつまんで拡大縮小。中心からの距離の比で倍率を決める
function onResizePointerDown(ev, t, el, h) {
  var rect = canvas.getBoundingClientRect();
  var cx = t.x + TILE / 2, cy = t.y + TILE / 2;
  var d0 = Math.hypot(ev.clientX - rect.left - cx, ev.clientY - rect.top - cy) || 1;
  var s0 = t.scale;
  dragHandle(ev, h, function (e) {
    var d = Math.hypot(e.clientX - rect.left - cx, e.clientY - rect.top - cy);
    setScale(t, el, s0 * d / d0);
  });
}

// 左上をつまんで回転。中心から見たポインタの方位で角度を決める。Shiftで15°刻み。
function onRotatePointerDown(ev, t, el, h) {
  var rect = canvas.getBoundingClientRect();
  var cx = t.x + TILE / 2, cy = t.y + TILE / 2;
  var ang = function (e) { return Math.atan2(e.clientY - rect.top - cy, e.clientX - rect.left - cx) * 180 / Math.PI; };
  var a0 = ang(ev), r0 = t.rot;
  dragHandle(ev, h, function (e) {
    var r = r0 + (ang(e) - a0);
    if (e.shiftKey) r = Math.round(r / 15) * 15;
    t.rot = ((Math.round(r) % 360) + 360) % 360;
    applyTransform(el, t);
    $('ctl-rot').value = t.rot;
    $('ctl-rot-label').textContent = t.rot + '°';
  });
}

// 倍率を範囲内に収めて反映し、スライダー表示も追従させる（リサイズ・ピンチで共用）
function setScale(t, el, scale) {
  t.scale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, scale));
  applyTransform(el, t);
  $('ctl-scale').value = t.scale;
  $('ctl-scale-label').textContent = t.scale.toFixed(1) + '×';
}

// ---------- タイル本体のドラッグ / ピンチ ----------
// 指1本＝移動、指2本＝ピンチ拡大縮小。ポインタ集合を el._gesture に持つ小さな状態機械。
function onTilePointerDown(ev, t, el) {
  ev.preventDefault();
  state.selectedId = t.id;
  t.z = state.nextZ++;
  el.style.zIndex = String(t.z);
  Array.prototype.slice.call(canvas.querySelectorAll('.tile.selected')).forEach(function (x) { x.classList.remove('selected'); });
  el.classList.add('selected', 'dragging');
  attachHandle(el, t);
  flags.isDragging = true;
  renderControls();

  var rect = canvas.getBoundingClientRect();
  var G = el._gesture || (el._gesture = { pointers: new Map(), mode: 'idle', bound: false });
  el.setPointerCapture(ev.pointerId);
  G.pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

  if (G.pointers.size === 1) {
    G.mode = 'drag';
    G.offX = ev.clientX - rect.left - t.x;
    G.offY = ev.clientY - rect.top - t.y;
  } else if (G.pointers.size === 2) {
    G.mode = 'pinch';
    var pts = Array.from(G.pointers.values());
    G.dist0 = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
    G.scale0 = t.scale;
  }

  if (G.bound) return;           // move/up は最初の指のときだけ張る
  G.bound = true;

  function move(e) {
    if (!G.pointers.has(e.pointerId)) return;
    G.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (G.mode === 'pinch' && G.pointers.size >= 2) {
      var p = Array.from(G.pointers.values());
      var d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      setScale(t, el, G.scale0 * d / G.dist0);   // 位置は動かさず倍率だけ変える
    } else if (G.mode === 'drag') {
      var only = G.pointers.values().next().value;
      t.x = only.x - rect.left - G.offX;
      t.y = only.y - rect.top - G.offY;
      clampPos(t);
      applyTransform(el, t);
    }
  }
  function up(e) {
    G.pointers.delete(e.pointerId);
    if (G.pointers.size === 1) {
      // ピンチ→1本に戻ったら、残った指で移動を続けられるよう基準を取り直す（位置飛び防止）
      G.mode = 'drag';
      var only = G.pointers.values().next().value;
      G.offX = only.x - rect.left - t.x;
      G.offY = only.y - rect.top - t.y;
    } else if (G.pointers.size === 0) {
      G.mode = 'idle';
      G.bound = false;
      flags.isDragging = false;
      el.classList.remove('dragging');
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      save();
    }
  }
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
}

// ---------- サジェスト ----------
export function renderSuggest() {
  var box = $('suggest');
  box.innerHTML = '';
  var list = state.randoms || [];
  if (!list.length) {
    var e = document.createElement('span');
    e.className = 'empty';
    e.textContent = state.tiles.length ? '出しなおしてみてください' : 'まずは「引く」から';
    box.appendChild(e);
    return;
  }
  list.forEach(function (c) {
    var b = document.createElement('button');
    b.className = 'sug';
    b.innerHTML = '<span class="w"></span>';
    b.querySelector('.w').textContent = c.w;
    b.addEventListener('click', function () { arrangeWord(c); });
    box.appendChild(b);
  });
}

// 候補語をキャンバス上に横一列で並べる
function arrangeWord(c) {
  var used = [];
  c.tokens.forEach(function (tk) {
    // 未使用のタイルから、まず手札（未配置）を優先して割り当てる
    var pool = state.tiles.filter(function (t) {
      return t.char === tk && used.indexOf(t.id) < 0;
    });
    pool.sort(function (a, b) { return (a.placed ? 1 : 0) - (b.placed ? 1 : 0); });
    var t = pool[0];
    if (!t) return;
    used.push(t.id);
    t.placed = true;
    t.rot = 0; t.scale = 1; t.flipped = false; t.opacity = 1;
    t.z = state.nextZ++;
  });

  // 見立て（ォ / 二）は元の表記に合わせる
  var raw = [];
  for (var i = 0; i < c.w.length; i++) {
    var two = c.w.substr(i, 2);
    if (two === '!?' || two === '！？') { raw.push('!?'); i++; continue; }
    raw.push(c.w[i]);
  }

  var s = canvasSize();
  var gap = 6;
  var total = used.length * TILE + (used.length - 1) * gap;
  var startX = Math.max(0, (s.w - total) / 2);
  var y = Math.max(0, s.h / 2 - TILE / 2);

  used.forEach(function (id, i) {
    var t = state.tiles.filter(function (x) { return x.id === id; })[0];
    t.x = startX + i * (TILE + gap);
    t.y = y;
    var v = VARIANTS[t.char];
    t.variant = v ? Math.max(0, v.indexOf(raw[i])) : 0;
    clampPos(t);
  });

  state.selectedId = null;
  renderAll();
}
