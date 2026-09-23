# 学区検索マップ

都道府県・市区町村・学校を選択し、学区、学校所在地、検索した場所と学校への徒歩ルートを表示します。
変更のまとめは [CHANGELOG.md](CHANGELOG.md) を参照してください。

## ローカルで起動

1. `config.example.js` を `config.local.js` にコピーし、自分の Google Maps API キーを設定します。
2. 学区データを `map_data` フォルダーに配置し、下記のエクスポーターを実行します。
3. プロジェクトのフォルダーで Python 3 の HTTP サーバーを起動します。

```sh
cp config.example.js config.local.js
python3 -m http.server 8000 --bind 127.0.0.1
```

http://localhost:8000/selectTest.html を開きます。終了は Ctrl+C。
HTML を直接 `file://` で開くとデータを取得できません。
すでに `config.local.js` がある場合はコピーで上書きしないでください。

## Google Maps の設定

同じ Google Cloud プロジェクトで以下を有効にし、API キーの API 制限でも許可します。

- Maps JavaScript API：地図とピン
- Places API (New)：場所・住所の検索
- Geocoding API：学校住所から所在地の座標を取得
- Routes API：徒歩ルート

キーのウェブサイト制限に `http://localhost:8000/*` を設定します。
`127.0.0.1` を使う場合は `http://127.0.0.1:8000/*` も追加します。
公開時は本番ドメイン用の制限付きキーと、自分のマップ ID を使用してください。
`DEMO_MAP_ID` はテスト用です。課金設定、利用量、クォータ、予算通知も確認してください。
各サービスは別の利用料金が発生する場合があります。

`config.local.js` は Git の対象外です。公開用設定もリポジトリーにコミットせず、配信時に用意します。
ブラウザーで使用する API キーはサイト閲覧者から見えるため、Git から除外するだけでは保護になりません。
Google Cloud のウェブサイト制限・API 制限を必ず設定してください。

## 学校データ

エクスポーターは2023年度版の `map_data/A27-23_XX.geojson` を入力に使用します。ブラウザーは生成済みの `data/elementary/2023/` のみ読み込みます。
`XX` は `PrefCd.xml` の2桁の都道府県コード（01〜47）です。

- 北海道：`map_data/A27-23_01.geojson`
- 東京都：`map_data/A27-23_13.geojson`
- 神奈川県：`map_data/A27-23_14.geojson`

データはリポジトリーに含めません。利用条件を確認のうえ、必要な都道府県のファイルを別途取得してください。
`PrefCd.xml` と `AdminAreaCd.xml` は既存のコード表で、プロジェクト直下に置きます。
旧 `A27-10` XML のファイル名を変更するだけでは対応できません。

GeoJSON の Polygon / MultiPolygon で学区を描画します。
学校名は A27_004、住所は A27_005、学校コードは A27_003 を使用します。
政令指定都市全体を選ぶと市内の学校を表示し、区を選んだ場合はコードまたは学校住所で絞り込みます。
学校住所に区名がない場合や、古いコード表との不一致がある場合は学校が一覧に出ないことがあります。

## 使い方

1. 都道府県・市区町村・学校を選び、「描画」で境界線と赤い学校ピンを表示します。
2. 場所名・住所を入力して「検索」を押し、最大5件の候補から選ぶと青いピンが表示されます。
3. 両方のピンがある状態で「徒歩ルートを表示」を押すと、検索地点から学校への経路・推定時間・距離を表示します。
4. ピンをクリックすると名称・住所を表示します。学校、検索結果、ルートは個別に削除できます。

学校所在地は住所を Geocoding API で変換した位置です。学校入口の位置を保証しません。
住所がない場合、検索結果が曖昧な場合、API が使えない場合は境界のみ表示します。
徒歩ルートは Google が返した候補の中で推定時間が最短のものを表示します。
公式の通学路や安全性を保証するものではありません。学校・検索結果の変更時は古いルートを削除します。

## 公開前の確認

データの年度・利用条件・自治体の最新情報を確認してください。
大きな都道府県ファイルは通信量・メモリー使用量が増えるため、公開前の分割・軽量化を推奨します。
Google の利用条件・プライバシー表示・出典表示、モバイル動作、API 制限と費用を確認してください。

## 参考

- [国土数値情報 小学校区データ](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A27-2023.html)
- [Google Geocoding](https://developers.google.com/maps/documentation/javascript/geocoding)
- [Google Places Text Search](https://developers.google.com/maps/documentation/javascript/place-search)
- [Google Routes](https://developers.google.com/maps/documentation/javascript/routes/get-a-route)
- [参考にした行政区域描画の実装](http://memopad.bitter.jp/web/GoogleMap/V3/myMap/place/index.html)

## Web 配信用データの生成と遅延読み込み

Python 3（追加パッケージ不要）で実行します。

```sh
python3 scripts/export_map_data.py
python3 scripts/verify_map_export.py
```

初期値は全47都道府県、出力先は `data/elementary/2023/` です。一部だけを出力する場合：

```sh
python3 scripts/export_map_data.py --prefectures 13,14
```

全都道府県の元ファイルを揃えるか、用意した都道府県を明示してください。
ブラウザーの都道府県一覧にはエクスポートしたものだけを表示します。
`--source` と `--output` で入力・出力先を変更できますが、アプリは標準の
`data/elementary/2023/` を参照します。`--chunk-bytes` は境界チャンクの目標サイズ（既定1 MiB）です。
同じ学校の複数の境界は分離せず、1校が目標を超える場合はそのまま1チャンクにします。
25 MiB を超えるファイルは出力エラーにします。

- ページ起動時：小さい manifest を読み込みます。
- 都道府県選択時：市区町村一覧を読み込みます。
- 市区町村選択時：学校名・住所・境界ファイル参照のみを読み込みます。
- 「描画」時：選択した学校を含む境界チャンクだけを読み込みます。
- 成功したファイル取得は最大12件をメモリーに保持し、失敗した取得は再試行可能です。

座標の丸め・境界の簡略化は行いません。検証スクリプトは全元フィーチャーの一致
（穴・離島などを含む）、学校リストの参照、ファイルサイズ・件数を確認します。
従来のコード表にない自治体コードも数値コードとして選択できるようにします。
住所による区の分類は元データの住所表記に依存します。

ファイル名には内容のハッシュを付け、manifest は最後に更新します。
再出力時は旧ファイルを削除しません。リリース用には空の出力先で生成し、
検証した出力全体を配置してください（旧ハッシュファイルを含めた配信件数に注意）。
この工程はデータ生成のみで、サイトを公開・アップロードするものではありません。
`map_data/`、`data/`、`dist/` は Git 対象外です。

ローカルの回帰チェック：

```sh
python3 -m unittest discover -s tests -p 'test_*.py'
node tests/lazySchoolData.test.js
```

## 静的ホスティング用パッケージ

データ生成・検証後、次のコマンドで `dist/` を作成します。この操作はローカルのみで、
サイトの公開や GitHub へのアップロードは行いません。

```sh
python3 scripts/build_deployment.py
```

初期状態は API キーを含まないプレースホルダー設定です。ページは開けますが、
Google Maps の機能を使うには公開用設定を指定して再ビルドしてください。
このスクリプトは `config.local.js` を読み取ったりコピーしたりしません。

### 公開用設定

`config.production.example.json` を `config.production.json` にコピーし、エディターで
本番用の制限付きブラウザー API キーと、自分の Google Maps マップ ID を設定します。
`config.production.json` は Git 対象外です。既存ファイルは上書きしないでください。

```sh
python3 scripts/build_deployment.py --config config.production.json --require-config
```

JSON ファイルの代わりに、ビルド環境の `GAKKUMAP_API_KEY` と `GAKKUMAP_MAP_ID` を使用することもできます。
`--require-config` は未設定キー・サンプル設定・デモ map ID を拒否します。
実際のキーの有効性、API 有効化、ドメイン制限、課金設定は Google Cloud 側で別途確認が必要です。
設定値をビルドログには出力しませんが、配信される `dist/config.js` にはブラウザー用キーが含まれます。
ブラウザー用キーは訪問者から見えるため、公開ドメインと必要な API への制限が必要です。
秘密のサーバーキーや認証情報をこの設定に入れないでください。

### パッケージの内容と検証

- `index.html`：サイトの入口（開発用の `selectTest.html` から生成）
- `assets/`：内容ハッシュ付きの JavaScript と CSS
- `config.js`：公開用ブラウザー設定（未指定の場合はプレースホルダー）
- `data/elementary/2023/`：manifest から参照される索引と境界チャンクのみ
- `_headers`：Cloudflare Pages 用のキャッシュ・セキュリティ設定
- `.gakkumap-build.json`：キーを含まないビルド結果・設定有無の記録

元の `map_data/`、使われていない古いデータチャンク、ローカル設定、Git、テスト、
エディター設定などは同梱しません。元データの出典・利用条件に関する公開ページは別途準備してください。
ビルド時に HTML のファイル参照、データ参照、25 MiB の単一ファイル上限、20,000 ファイル上限、
アプリ資産内のキー・個人パス混入をチェックします。
このビルダーが生成した `dist/` は再実行時に置き換わるため、中を手作業で編集しないでください。
元データの完全一致検証は `scripts/verify_map_export.py` を使用してください。

ローカルでパッケージだけを確認するには：

```sh
python3 -m http.server 8001 --bind 127.0.0.1 --directory dist
```

http://localhost:8001/ を開きます。地図も試す場合は、テスト用の制限付きキーでパッケージを作り、
そのキーにテスト URL を許可してください。本番キーの制限をテスト用に広げる必要はありません。
本番向けビルドに戻してから配置します。

最終公開時は `dist/` の内容だけをアップロードします。設定入りビルドの成功は、
プライバシーポリシー・利用条件・データ利用許諾など公開準備の完了を意味しません。

## Junior-high data preparation (2023)

The exporter supports A32 junior-high GeoJSON in addition to A27 elementary data.
Original A32 XML and metadata are retained locally; conversion uses the provided GeoJSON.

```bash
python3 scripts/export_map_data.py --school-type junior-high
python3 scripts/verify_map_export.py --source map_data/junior_high_school --output data/junior-high/2023
```

Default input: `map_data/junior_high_school/A32-23_XX.geojson` (01–47).
Default output: `data/junior-high/2023/`. The manifest identifies `schoolType: junior-high`,
`dataset: A32` and year 2023. It references municipality indexes, school lists (name,
address and boundary reference), and content-hashed boundary chunks. Geometry and original
properties are preserved, including holes and multipart boundaries. No coordinates are
invented for school entrances; these records retain school addresses.

Elementary defaults remain unchanged. The exporter refuses to overwrite a manifest
for the other school type. Raw and generated data remain Git-ignored. The 小学校 / 中学校 switch loads one dataset at a time and retains the searched place.
The deployment builder includes both datasets; `--junior-data` overrides the junior-high input directory.
Selections are remembered per school type for the current session. Switching clears the previous school and route.
