var dataRoot = './data/2023/';
var dataCache = new Map();
var dataManifest;
var currentMunicipalities = [];
var boundaryLoadVersion = 0;

// Share in-flight requests; bound memory and permit retries after failures.
function loadMapAsset(path) {
  if (dataCache.has(path)) return dataCache.get(path);
  var request = fetch(dataRoot + path).then(function (response) {
    if (!response.ok) throw new Error(path + ': HTTP ' + response.status);
    return response.json();
  }).catch(function (error) {
    if (dataCache.get(path) === request) dataCache.delete(path);
    throw error;
  });
  dataCache.set(path, request);
  if (dataCache.size > 12) dataCache.delete(dataCache.keys().next().value);
  return request;
}

function setOptions(id, records, valueKey, nameKey) {
  var select = document.getElementById(id);
  select.textContent = '';
  var empty = document.createElement('option');
  empty.value = '00'; empty.textContent = '--選択--'; select.appendChild(empty);
  records.forEach(function (record) {
    var option = document.createElement('option');
    option.value = record[valueKey]; option.textContent = record[nameKey]; select.appendChild(option);
  });
}

async function loadPrefectureIndex() {
  try {
    var response = await fetch(dataRoot + 'manifest.json', {cache: 'no-cache'});
    if (!response.ok) throw new Error('manifest: HTTP ' + response.status);
    dataManifest = await response.json();
    if (dataManifest.schemaVersion !== 1) throw new Error('Unsupported data schema');
    setOptions('pref', dataManifest.prefectures, 'code', 'name');
    $('#pref').off('change', selectCity).on('change', selectCity);
  } catch (error) {
    $('#output').text('学校データの索引を読み込めません。README のデータ出力手順を実行してください。');
    console.error(error);
  }
}

async function loadMunicipalityIndex() {
  var version = ++cityLoadVersion;
  var pref = dataManifest.prefectures.find(function (p) { return p.code === prefCode; });
  if (!pref) return;
  try {
    var data = await loadMapAsset(pref.municipalities);
    if (version !== cityLoadVersion) return;
    currentMunicipalities = data.municipalities;
    setOptions('city', currentMunicipalities, 'code', 'name');
    $('#city').off('change', selectGaiku).on('change', selectGaiku);
    $('#output').text('');
  } catch (error) {
    if (version === cityLoadVersion) $('#output').text('市区町村の一覧を読み込めません。再選択してください。');
  }
}

async function loadSchoolIndex() {
  var version = ++schoolLoadVersion;
  var city = currentMunicipalities.find(function (c) { return c.code === cityCode; });
  if (!city) return;
  $('#output').text('学校一覧を読み込み中…');
  try {
    var data = await loadMapAsset(city.schools);
    if (version !== schoolLoadVersion) return;
    modernSchools = Object.create(null);
    data.schools.forEach(function (school) { modernSchools[school.id] = school; });
    setOptions('gaiku', data.schools, 'id', 'name');
    A27Xml = {type: 'SchoolIndex'};
    $('#output').text('');
  } catch (error) {
    if (version === schoolLoadVersion) $('#output').text('学校一覧を読み込めません。再選択してください。');
  }
}

async function loadSelectedBoundary() {
  clearSchoolBoundary();
  var version = boundaryLoadVersion;
  var school = modernSchools[$('#gaiku').val()];
  if (!school) return;
  $('#output').text('選択した学校の学区を読み込み中…');
  try {
    var data = await loadMapAsset(school.boundary);
    if (version !== boundaryLoadVersion) return;
    var features = data.schools[school.id];
    if (!Array.isArray(features)) throw new Error('School geometry missing');
    renderModernSchool({name: school.name, address: school.address, features: features});
  } catch (error) {
    if (version === boundaryLoadVersion) $('#output').text('学区を読み込めません。「描画」で再試行してください。');
  }
}
