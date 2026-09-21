// A27-23 GeoJSON: coordinates are [longitude, latitude].
var modernSchools = Object.create(null);
function loadModernSchoolOptions(data, cityCodes, selectedCityName) {
  if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    throw new Error('学校データは GeoJSON FeatureCollection である必要があります。');
  }
  modernSchools = Object.create(null);
  var select = document.getElementById('gaiku');
  select.textContent = '';
  var placeholder = document.createElement('option');
  placeholder.value = '00'; placeholder.textContent = '--選択--'; select.appendChild(placeholder);
  data.features.forEach(function (feature, index) {
    var p = feature.properties || {};
    var codeMatches = cityCodes.indexOf(String(p.A27_001).padStart(5, '0')) !== -1;
    // 2023 data uses parent city codes; identify individual wards by school address.
    var wardMatches = selectedCityName && /市.+区$/.test(selectedCityName) &&
      String(p.A27_005 || '').indexOf(selectedCityName) === 0;
    if (!codeMatches && !wardMatches) return;
    var key = JSON.stringify([p.A27_001, p.A27_003 || p.A27_004, p.A27_005]);
    if (!modernSchools[key]) {
      modernSchools[key] = {name: p.A27_004 || '名称不明', address: p.A27_005 || '', features: []};
      var option = document.createElement('option');
      option.value = key; option.textContent = modernSchools[key].name; select.appendChild(option);
    }
    modernSchools[key].features.push(feature);
  });
  if (!Object.keys(modernSchools).length) {
    $('#output').text('この市区町村の学校区はデータに含まれていません。');
  }
}
function drawModernSchool() {
  deletePoly();
  var school = modernSchools[$('#gaiku').val()];
  if (!school) return;
  bounds = new google.maps.LatLngBounds();
  sArea = []; sLine = [];
  var polygonMode = $('input[name=ptype]:checked').val() === '1';
  school.features.forEach(function (feature) {
    var geometry = feature.geometry;
    if (!geometry) return;
    var polygons = geometry.type === 'Polygon' ? [geometry.coordinates] :
      geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
    polygons.forEach(function (polygon) {
      var paths = polygon.map(function (ring) {
        return ring.map(function (coordinate) {
          var point = {lat: coordinate[1], lng: coordinate[0]};
          bounds.extend(point); return point;
        });
      });
      if (polygonMode) {
        sArea.push(new google.maps.Polygon({map: map, paths: paths,
          strokeColor: '#FF0000', strokeWeight: 3, strokeOpacity: 0.8,
          fillColor: '#FF0000', fillOpacity: 0.1}));
      } else {
        paths.forEach(function (path) {
          sLine.push(new google.maps.Polyline({map: map, path: path,
            strokeColor: '#FF0000', strokeWeight: 3, strokeOpacity: 0.8}));
        });
      }
    });
  });
  if (!bounds.isEmpty()) map.fitBounds(bounds);
  geocodeSchoolAddress(school, prefName);
}
