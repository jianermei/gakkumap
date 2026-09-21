// A27-23 GeoJSON: coordinates are [longitude, latitude].
var modernSchools = Object.create(null);
function drawModernSchool() { return loadSelectedBoundary(); }

function renderModernSchool(school) {
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
  // Selection changes already remove the old marker and invalidate its route.
  // Reuse the current endpoint when only redrawing the same school boundary.
  if (schoolMarker && schoolMarker.position) bounds.extend(schoolMarker.position);
  walkingPolylines.forEach(function (line) {
    line.getPath().forEach(function (point) { bounds.extend(point); });
  });
  if (!bounds.isEmpty()) fitMapResults(bounds);
  if (schoolMarker) {
    $('#output').text('');
  } else {
    geocodeSchoolAddress(school, prefName);
  }
}
