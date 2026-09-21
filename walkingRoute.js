var walkingPolylines = [];
var walkingRouteVersion = 0;

function clearWalkingRoute() {
  walkingRouteVersion++;
  walkingPolylines.forEach(function (line) { line.setMap(null); });
  walkingPolylines = [];
  document.getElementById('walking-status').textContent = '';
  document.getElementById('walking-status').classList.remove('route-result');
  document.getElementById('walking-notices').textContent = '';
  document.getElementById('walking-button').disabled = false;
}

function fastestWalkingRoute(routes) {
  return routes.filter(function (route) {
    return typeof route.durationMillis === 'number' && isFinite(route.durationMillis) &&
      route.durationMillis >= 0 && route.path && route.path.length;
  }).sort(function (a, b) { return a.durationMillis - b.durationMillis; })[0];
}

async function drawWalkingRoute() {
  clearWalkingRoute();
  var status = document.getElementById('walking-status');
  if (!map || !searchMarker || !schoolMarker) {
    status.textContent = '場所を検索し、学校を選択して「学区を表示」を押してから徒歩ルートを表示してください。';
    return;
  }
  var version = walkingRouteVersion;
  var origin = searchMarker.position;
  var destination = schoolMarker.position;
  var button = document.getElementById('walking-button');
  button.disabled = true;
  status.textContent = '徒歩ルートを検索中…';
  try {
    var library = await google.maps.importLibrary('routes');
    if (version !== walkingRouteVersion) return;
    var response = await library.Route.computeRoutes({
      origin: origin,
      destination: destination,
      travelMode: 'WALKING',
      computeAlternativeRoutes: true,
      language: 'ja',
      fields: ['path', 'durationMillis', 'distanceMeters', 'warnings']
    });
    if (version !== walkingRouteVersion) return;
    var route = fastestWalkingRoute(response.routes || []);
    if (!route) {
      status.textContent = 'この2地点を結ぶ徒歩ルートが見つかりませんでした。';
      return;
    }
    walkingPolylines = route.createPolylines({polylineOptions: {
      strokeColor: '#1769d2', strokeOpacity: 0.9, strokeWeight: 5, zIndex: 10
    }});
    walkingPolylines.forEach(function (line) { line.setMap(map); });
    var routeBounds = new google.maps.LatLngBounds();
    routeBounds.extend(origin);
    routeBounds.extend(destination);
    route.path.forEach(function (point) { routeBounds.extend(point); });
    fitMapResults(routeBounds);
    var distance = typeof route.distanceMeters === 'number' && isFinite(route.distanceMeters)
      ? (route.distanceMeters >= 1000
        ? (route.distanceMeters / 1000).toFixed(1) + ' km' : Math.round(route.distanceMeters) + ' m') : '';
    status.textContent = '';
    status.classList.add('route-result');
    var label = document.createElement('span');
    label.className = 'route-label';
    label.textContent = '検索した場所 → 学校';
    var metrics = document.createElement('span');
    metrics.className = 'route-metrics';
    var duration = document.createElement('strong');
    duration.textContent = '徒歩 約' + Math.ceil(route.durationMillis / 60000) + '分';
    metrics.appendChild(duration);
    if (distance) {
      var distanceLabel = document.createElement('span');
      distanceLabel.className = 'route-distance';
      distanceLabel.textContent = distance;
      metrics.appendChild(distanceLabel);
    }
    var detail = document.createElement('span');
    detail.className = 'route-detail';
    detail.textContent = '取得できた候補の中で所要時間が最短';
    status.appendChild(label);
    status.appendChild(metrics);
    status.appendChild(detail);
    document.getElementById('walking-notices').textContent =
      (route.warnings || []).join('\n');
  } catch (error) {
    if (version !== walkingRouteVersion) return;
    console.error('Walking route failed:', error);
    status.textContent = /PERMISSION_DENIED|REQUEST_DENIED/.test(String(error))
      ? 'ルート検索が許可されていません。Google Cloud の Routes API と API キーの制限を確認してください（README 参照）。'
      : '徒歩ルートを取得できませんでした。接続状態を確認して再試行してください。';
  } finally {
    if (version === walkingRouteVersion) button.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('walking-button').addEventListener('click', drawWalkingRoute);
  document.getElementById('walking-clear').addEventListener('click', clearWalkingRoute);
  document.getElementById('gaiku').addEventListener('change', deletePoly);
});
