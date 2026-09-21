# 学区検索マップ

都道府県・市区町村・学校を選択し、学区、学校所在地、検索した場所と学校への徒歩ルートを表示します。
変更のまとめは [CHANGELOG.md](CHANGELOG.md) を参照してください。

## ローカルで起動

1. `config.example.js` を `config.local.js` にコピーし、自分の Google Maps API キーを設定します。
2. 学区データを `map_data` フォルダーに配置します（下記参照）。
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

現在のローダーは2023年度版の `map_data/A27-23_XX.geojson` を使用します。
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
