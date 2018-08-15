# gakkumap
[行政区域を描画する](http://memopad.bitter.jp/web/GoogleMap/V3/myMap/place/index.html)を参照して、学区検索ツールを実装しました。

# 機能
東京都（※1）の各市区町村の小学校の学校を地図上で表示します。
![学区検索マップサンプル](/学区検索マップSample.png) 

# 不足部分（※）
<ol>
  <li> 東京都以外の学区データは含まれていません。
  <li> 学校名をロードするのに時間かかります。
  <li> 学校名は重複することがあります。（e.g.中央区月島第三小学校）
  <li> 明らかに小学校ではない所が表示されます。（e.g.中央区京橋築地小学校）
</ol>

# データ
A27-10_13.xmlは[国土数値情報ダウンロードサービス](http://nlftp.mlit.go.jp/ksj/jpgis/datalist/KsjTmplt-A27.html)からダウンロードできます。
