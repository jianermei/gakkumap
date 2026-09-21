var searchMarker = null;
var searchInfoWindow = null;
var searchVersion = 0;
var searchPlaces = [];

function removeSearchMarker() {
  clearWalkingRoute();
  if (searchMarker) searchMarker.map = null;
  searchMarker = null;
  if (searchInfoWindow) searchInfoWindow.close();
}

function clearPlaceSearch() {
  searchVersion++;
  removeSearchMarker();
  searchPlaces = [];
  document.getElementById('place-results').hidden = true;
  document.getElementById('place-result').textContent = '';
  document.getElementById('search-status').textContent = '';
  document.getElementById('place-search-button').disabled = false;
}

function showSearchPlace(index) {
  var place = searchPlaces[index];
  if (!place || !place.location || !map) return;
  removeSearchMarker();
  var pin = new google.maps.marker.PinElement({
    background: '#1769d2',
    borderColor: '#104a96',
    glyphColor: '#ffffff',
    scale: 1
  });
  searchMarker = new google.maps.marker.AdvancedMarkerElement({
    map: map,
    position: place.location,
    title: '検索結果: ' + (place.displayName || place.formattedAddress),
    gmpClickable: true,
    zIndex: 1000
  });
  searchMarker.append(pin);
  var marker = searchMarker;
  marker.addEventListener('gmp-click', function () {
    var content = document.createElement('div');
    var name = document.createElement('strong');
    name.textContent = place.displayName || '検索結果';
    var address = document.createElement('div');
    address.textContent = place.formattedAddress || '';
    content.appendChild(name);
    content.appendChild(address);
    if (!searchInfoWindow) searchInfoWindow = new google.maps.InfoWindow();
    searchInfoWindow.setContent(content);
    searchInfoWindow.open({map: map, anchor: marker});
  });
  var visibleBounds = new google.maps.LatLngBounds();
  visibleBounds.extend(place.location);
  if (schoolMarker && schoolMarker.position) {
    visibleBounds.extend(schoolMarker.position);
    if (bounds && !bounds.isEmpty()) visibleBounds.union(bounds);
    fitMapResults(visibleBounds);
  } else {
    centerMapResult(place.location);
  }
}

async function searchPlace(event) {
  event.preventDefault();
  var query = document.getElementById('place-query').value.trim();
  var status = document.getElementById('search-status');
  if (!query) {
    status.textContent = '場所の名前または住所を入力してください。';
    return;
  }
  if (!map) {
    status.textContent = '地図の読み込み後に検索してください。';
    return;
  }
  clearPlaceSearch();
  var version = searchVersion;
  var button = document.getElementById('place-search-button');
  button.disabled = true;
  status.textContent = '検索中…';
  try {
    var library = await google.maps.importLibrary('places');
    if (version !== searchVersion) return;
    var response = await library.Place.searchByText({
      textQuery: query,
      fields: ['displayName', 'formattedAddress', 'location'],
      language: 'ja',
      region: 'jp',
      maxResultCount: 5
    });
    if (version !== searchVersion) return;
    searchPlaces = (response.places || []).filter(function (place) { return !!place.location; });
    if (!searchPlaces.length) {
      status.textContent = '見つかりませんでした。市区町村名を含めて検索してください。';
      return;
    }
    var list = document.getElementById('place-result');
    searchPlaces.forEach(function (place, index) {
      var item = document.createElement('li');
      var candidate = document.createElement('button');
      candidate.type = 'button';
      candidate.className = 'place-candidate';
      var name = document.createElement('strong');
      name.textContent = place.displayName || place.formattedAddress || '検索結果';
      var address = document.createElement('span');
      address.textContent = place.formattedAddress || '';
      candidate.appendChild(name);
      candidate.appendChild(address);
      candidate.addEventListener('click', function () {
        document.getElementById('place-query').value = place.displayName || place.formattedAddress || query;
        document.getElementById('place-results').hidden = true;
        status.textContent = '';
        showSearchPlace(index);
        document.getElementById('place-query').focus();
      });
      item.appendChild(candidate);
      list.appendChild(item);
    });
    document.getElementById('place-results').hidden = false;
    status.textContent = searchPlaces.length + '件の候補から場所を選択してください。';
  } catch (error) {
    if (version !== searchVersion) return;
    console.error('Place search failed:', error);
    status.textContent = /PERMISSION_DENIED|REQUEST_DENIED/.test(String(error))
      ? '検索が許可されていません。Google Cloud で Places API (New) を有効にし、API キーの制限を確認してください（README 参照）。'
      : '検索できませんでした。接続状態を確認してください。初回設定は README の「場所・住所検索」を参照してください。';
  } finally {
    if (version === searchVersion) button.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('place-search').addEventListener('submit', searchPlace);
  document.getElementById('place-clear').addEventListener('click', clearPlaceSearch);
  document.getElementById('place-query').addEventListener('input', function () {
    // Invalidate in-flight results when the query changes, keeping the chosen pin.
    searchVersion++;
    searchPlaces = [];
    document.getElementById('place-results').hidden = true;
    document.getElementById('place-result').textContent = '';
    document.getElementById('search-status').textContent = '';
    document.getElementById('place-search-button').disabled = false;
  });
  document.getElementById('place-search').addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      document.getElementById('place-results').hidden = true;
      document.getElementById('search-status').textContent = '';
      document.getElementById('place-query').focus();
    }
  });
});
