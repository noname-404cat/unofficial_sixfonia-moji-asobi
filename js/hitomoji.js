// 人文字の描画。文字の形（STROKES）に沿って小さな人を敷き詰め、1文字を作る。
import { STROKES, DOTS, RES } from './data.js';

var hitomojiCache = {};   // 表示文字 -> 描画済みキャンバス

// 折れ線に沿って体を伸ばした人をひとり描く
export function drawStretchedPerson(g, line, u) {
  var body = 11 * u;
  g.strokeStyle = '#16181d';
  g.fillStyle = '#16181d';
  g.lineWidth = body;
  g.lineCap = 'round';
  g.lineJoin = 'round';

  g.beginPath();
  g.moveTo(line[0][0] * u, line[0][1] * u);
  for (var i = 1; i < line.length; i++) g.lineTo(line[i][0] * u, line[i][1] * u);
  g.stroke();

  var x0 = line[0][0] * u, y0 = line[0][1] * u;
  var x1 = line[1][0] * u, y1 = line[1][1] * u;
  var dx = x1 - x0, dy = y1 - y0;
  var len = Math.sqrt(dx * dx + dy * dy) || 1;
  var ux = dx / len, uy = dy / len;

  // 腕（頭の少し下から左右へ）
  var ax = x0 + ux * body * 0.85, ay = y0 + uy * body * 0.85;
  var arm = body * 1.15;
  g.lineWidth = body * 0.5;
  [1, -1].forEach(function (sgn) {
    g.beginPath();
    g.moveTo(ax, ay);
    g.lineTo(ax + (-uy * sgn * 0.85 + ux * 0.5) * arm, ay + (ux * sgn * 0.85 + uy * 0.5) * arm);
    g.stroke();
  });

  // 脚（末端から2本に分かれる）
  var e = line[line.length - 1], p = line[line.length - 2];
  var ex = e[0] * u, ey = e[1] * u;
  var edx = ex - p[0] * u, edy = ey - p[1] * u;
  var elen = Math.sqrt(edx * edx + edy * edy) || 1;
  var vx = edx / elen, vy = edy / elen;
  var leg = body * 0.9;
  [0.42, -0.42].forEach(function (a) {
    var cos = Math.cos(a), sin = Math.sin(a);
    g.beginPath();
    g.moveTo(ex, ey);
    g.lineTo(ex + (vx * cos - vy * sin) * leg, ey + (vx * sin + vy * cos) * leg);
    g.stroke();
  });

  // 進行方向の逆側に頭
  var head = body * 0.72;
  g.beginPath();
  g.arc(x0 - ux * head * 1.15, y0 - uy * head * 1.15, head, 0, Math.PI * 2);
  g.fill();
}

function hitomojiCanvas(ch) {
  if (hitomojiCache[ch]) return hitomojiCache[ch];

  var out = document.createElement('canvas');
  out.width = out.height = RES;
  var g = out.getContext('2d');
  var u = RES / 100;   // 100×100 の設計座標 → 実解像度

  (STROKES[ch] || []).forEach(function (line) { drawStretchedPerson(g, line, u); });
  (DOTS[ch] || []).forEach(function (p) {
    g.beginPath();
    g.arc(p[0] * u, p[1] * u, 5.5 * u, 0, Math.PI * 2);
    g.fill();
  });

  hitomojiCache[ch] = out;
  return out;
}

export function hitomojiEl(ch) {
  var c = document.createElement('canvas');
  c.width = c.height = RES;
  c.getContext('2d').drawImage(hitomojiCanvas(ch), 0, 0);
  return c;
}
