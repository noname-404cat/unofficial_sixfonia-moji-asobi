// 画像版ページの入口：先に字の画像を読み込んで登録し、そのあと通常の main.js を起動する。
import { registerGlyphImages } from './hitomoji.js';
import { loadGlyphImages } from './glyph-images.js';

var map = await loadGlyphImages('img/glyphs/');
registerGlyphImages(map);
console.log('画像版：' + Object.keys(map).length + ' 字を画像で表示（残りは座標で描画）');
await import('./main.js');
