# 【非公式】シクフォニ文字あそび

「シ・ク・フ・オ・ニ・!?」の6パターンをランダムに引いて、並べ替えたり・重ねたり・回したりして新しいことばを作る、非公式のファン制作ミニサイト。

- リポジトリ: `noname-404cat/unofficial_sixfonia_mozi_asobi_tool`
- 公開URL: https://noname-404cat.github.io/unofficial_sixfonia_mozi_asobi_tool/ （公開後に有効）
- ビルド不要・外部依存ゼロ。`index.html` 1ファイルだけで動く。

## 遊びかた

1. 枚数（6〜24枚）を決めて **引く**。同じ文字が何枚出てもOK。
2. 手札の文字をタップするとキャンバスに置かれる。
3. キャンバス上ではドラッグで移動、選択すると **回転 / 拡大縮小 / 左右反転 / 濃さ / 重ね順 / 見立て（オ→ォ、ニ→二）** を変更できる。
   文字に枠や背景はないので、**重ねると線どうしが組み合わさる**。
4. 「作れる言葉例」は、**今の手札の文字だけをランダムに組んだ並び**を12件表示する。意味のあることばとは限らない。押すとキャンバスに整列配置され、「別の組み合わせを出す」で引き直せる。
5. **人文字にする** をONにすると、**1画＝1人**が体を伸ばして文字を作る（1文字あたり1〜3人）。回転・重ね・濃さ・見立てはそのまま効く。
6. キーボード: `R`=90°回転 / 矢印=微調整（Shiftで10px）/ `Delete`=手札に戻す

配置は localStorage に自動保存され、リロードしても復元される（端末をまたぐ共有はしない）。

## 調整ポイント（index.html 内）

| 変えたいもの | 場所 |
| --- | --- |
| 出したくない並び | `NG` 配列（初期値は `シニ` のみ） |
| 候補の表示件数 | `refreshRandoms()` の `buildRandoms(12)` |
| 候補の長さ | `buildRandoms()` の `maxLen`（初期値は最大5文字） |
| ォ・二 の出やすさ | `buildRandoms()` 内の `Math.random()` のしきい値 |
| 人文字の字形・人数 | `STROKES`（文字ごとの画を100×100座標の折れ線で定義。1本＝1人） |
| 人ひとりの形 | `drawStretchedPerson()`（胴＝折れ線、頭・腕・脚を付加。`body` が太さの基準） |

## ローカル確認

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File serve.ps1
# → http://localhost:8766/
```

## 公開（GitHub Pages）

アカウント **noname-404cat** のパブリックリポジトリとして公開する。

```bash
gh auth status                     # noname-404cat になっているか確認
git init && git add -A && git commit -m "初回コミット"
gh repo create noname-404cat/unofficial_sixfonia_mozi_asobi_tool --public --source=. --push
```

その後 Settings → Pages で `main` / `/`(root) を公開元に設定する。

## 注意

- 非公式のファン制作物。シクフォニ及び関係者とは関係ありません。
- Webフォントを使っていないため、端末によって字形（＝重ねた時の見え方）が変わります。
