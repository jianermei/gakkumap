var schoolGeocodeVersion = 0;
var schoolMarker = null;
var schoolLocationDocument = null;
var schoolLocations = null;

function xmlElements(node, name) {
  return Array.prototype.slice.call(node.getElementsByTagNameNS('*', name));
}

function xmlText(node, name) {
  var element = xmlElements(node, name)[0];
  return element ? element.textContent.trim() : '';
}

// SD01 and SD02 have no direct school ID link. Match all shared attributes
// so identically named schools in different municipalities remain distinct.
function schoolIdentity(node) {
  return JSON.stringify(['CCD', 'ESN', 'INS', 'ADS'].map(function (name) {
    return xmlText(node, name);
  }));
}

function parseSchoolPosition(text) {
  var coordinates = text.trim().split(/\s+/);
  if (coordinates.length !== 2) return null;
  var lat = Number(coordinates[0]);
  var lng = Number(coordinates[1]);
  if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return {lat: lat, lng: lng};
}

function buildSchoolLocations(xml) {
  var points = Object.create(null);
  var schools = Object.create(null);
  var locations = Object.create(null);
  xmlElements(xml, 'GM_Point').forEach(function (point) {
    points[point.getAttribute('id')] = parseSchoolPosition(xmlText(point, 'DirectPosition.coordinate'));
  });
  xmlElements(xml, 'SD01').forEach(function (school) {
    var reference = xmlElements(school, 'POS')[0];
    var position = reference && points[reference.getAttribute('idref')];
    var key = schoolIdentity(school);
    // Do not guess a location if the school identity is ambiguous.
    if (Object.prototype.hasOwnProperty.call(schools, key)) {
      schools[key] = null;
    } else {
      schools[key] = position ? {
        position: position,
        name: xmlText(school, 'ESN'),
        address: xmlText(school, 'ADS')
      } : null;
    }
  });
  xmlElements(xml, 'SD02').forEach(function (boundary) {
    var reference = xmlElements(boundary, 'ARE')[0];
    if (reference) locations[reference.getAttribute('idref')] = schools[schoolIdentity(boundary)] || null;
  });
  return locations;
}

function clearSchoolMarker() {
  document.getElementById('school-location-note').textContent = '';
  schoolGeocodeVersion++;
  clearWalkingRoute();
  if (schoolMarker) {
    schoolMarker.map = null;
    schoolMarker = null;
  }
  if (infoWindow) infoWindow.close();
}

function drawSchoolMarker(surfaceId) {
  clearSchoolMarker();
  if (schoolLocationDocument !== A27Xml) {
    schoolLocations = buildSchoolLocations(A27Xml);
    schoolLocationDocument = A27Xml;
  }
  var school = schoolLocations[surfaceId];
  if (!school) {
    $('#output').text('この学校の所在地を XML から特定できないため、ピンを表示できません。');
    return;
  }
  renderSchoolMarker(school);
}

function renderSchoolMarker(school) {
  schoolMarker = new google.maps.marker.AdvancedMarkerElement({
    map: map,
    position: school.position,
    title: school.name,
    gmpClickable: true
  });
  var marker = schoolMarker;
  marker.addEventListener('gmp-click', function () {
    var content = document.createElement('div');
    var title = document.createElement('strong');
    title.textContent = school.name;
    var address = document.createElement('div');
    address.textContent = school.address;
    content.appendChild(title);
    content.appendChild(address);
    if (!infoWindow) infoWindow = new google.maps.InfoWindow();
    infoWindow.setContent(content);
    infoWindow.open({map: map, anchor: marker});
  });
  // A school's point can lie outside its attendance boundary.
  var hasBoundary = bounds && !bounds.isEmpty();
  bounds.extend(school.position);
  if (hasBoundary) {
    fitMapResults(bounds);
  } else {
    centerMapResult(school.position);
  }
}

// The current A27 dataset supplies an address, not a school-point geometry.
function geocodeSchoolAddress(school, prefecture) {
  var version = schoolGeocodeVersion;
  if (!school.address || !school.address.trim()) {
    $('#output').text('この学校には所在地の住所がありません。学区のみ表示します。');
    return;
  }
  var address = school.address.trim();
  if (prefecture && address.indexOf(prefecture) !== 0) address = prefecture + address;
  $('#output').text('学校の住所から所在地を検索中…');
  new google.maps.Geocoder().geocode({address: address, componentRestrictions: {country: 'JP'}},
    function (results, status) {
      if (version !== schoolGeocodeVersion || !map) return;
      if (status !== 'OK') {
        $('#output').text(status === 'REQUEST_DENIED'
          ? '学校所在地を検索できません。Google Cloud で Geocoding API を有効にし、API キーの制限を確認してください。'
          : '学校所在地を取得できませんでした（' + status + '）。学区のみ表示します。');
        return;
      }
      var matches = (results || []).filter(function (result) {
        return !result.partial_match && result.geometry && result.geometry.location &&
          ['ROOFTOP', 'RANGE_INTERPOLATED'].indexOf(result.geometry.location_type) !== -1;
      });
      if (matches.length !== 1) {
        $('#output').text('学校の住所を一意に特定できませんでした。学区のみ表示します。');
        return;
      }
      renderSchoolMarker({name: school.name, address: address, position: matches[0].geometry.location});
      $('#output').text('');
      document.getElementById('school-location-note').textContent = '学校ピンは所在地の住所から求めた位置です。学校の入口を示すとは限りません。';
    });
}
