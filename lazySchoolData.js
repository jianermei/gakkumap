var dataRoot = './data/elementary/2023/';
var dataCache = new Map();
var dataManifest;
var currentMunicipalities = [];
var boundaryLoadVersion = 0;

// Share in-flight requests; bound memory and permit retries after failures.
function loadMapAsset(path) {
  var url = dataRoot + path;
  if (dataCache.has(url)) return dataCache.get(url);
  var request = fetch(url).then(function (response) {
    if (!response.ok) throw new Error(path + ': HTTP ' + response.status);
    return response.json();
  }).catch(function (error) {
    if (dataCache.get(url) === request) dataCache.delete(url);
    throw error;
  });
  dataCache.set(url, request);
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
  var root = dataRoot;
  var typeVersion = schoolTypeVersion;
  try {
    var response = await fetch(root + 'manifest.json', {cache: 'no-cache'});
    if (!response.ok) throw new Error('manifest: HTTP ' + response.status);
    var manifest = await response.json();
    if (root !== dataRoot || typeVersion !== schoolTypeVersion) return;
    dataManifest = manifest;
    if (dataManifest.schemaVersion !== 1) throw new Error('Unsupported data schema');
    setOptions('pref', dataManifest.prefectures, 'code', 'name');
    $('#pref').off('change', selectCity).on('change', selectCity);
  } catch (error) {
    if (root !== dataRoot || typeVersion !== schoolTypeVersion) return;
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

var activeSchoolType = 'elementary';
var schoolTypeVersion = 0;
var schoolTypeSelections = {};
async function switchSchoolType(type) {
  if (type === activeSchoolType && dataManifest) return;
  var previous = {pref: $('#pref').val(), city: $('#city').val(), school: $('#gaiku').val()};
  schoolTypeSelections[activeSchoolType] = previous;
  var desired = schoolTypeSelections[type] || previous;
  activeSchoolType = type;
  var version = ++schoolTypeVersion;
  ['pref', 'city', 'gaiku', 'draw-school'].forEach(function (id) { document.getElementById(id).disabled = true; });
  try {
  cityLoadVersion++; schoolLoadVersion++;
  deletePoly(); lastMapResult = null;
  dataRoot = './data/' + type + '/2023/';
  dataManifest = null; currentMunicipalities = []; modernSchools = Object.create(null); A27Xml = null;
  ['pref', 'city', 'gaiku'].forEach(function (id) { setOptions(id, [], 'code', 'name'); });
  document.querySelectorAll('[data-school-type]').forEach(function (button) {
    button.setAttribute('aria-pressed', String(button.dataset.schoolType === type));
  });
  document.getElementById('school-type-label').textContent = type === 'elementary' ? '調べたい小学校' : '調べたい中学校';
  $('#output').text('学校種別を切り替え中…');
  await loadPrefectureIndex();
  if (version !== schoolTypeVersion || !dataManifest) return;
  function restore(id, value) {
    var select = document.getElementById(id);
    if (Array.prototype.some.call(select.options, function (option) { return option.value === value; })) select.value = value;
  }
  restore('pref', desired.pref);
  prefCode = $('#pref').val(); prefName = $('#pref option:selected').text();
  if (prefCode !== '00') await loadMunicipalityIndex();
  if (version !== schoolTypeVersion) return;
  restore('city', desired.city); cityCode = $('#city').val(); cityName = $('#city option:selected').text();
  if (cityCode !== '00') await loadSchoolIndex();
  if (version !== schoolTypeVersion) return;
  if (schoolTypeSelections[type]) restore('gaiku', desired.school);
  document.getElementById('gaiku').dispatchEvent(new Event('change'));
  if (prefCode === '00') $('#output').text('都道府県を選択してください。');
  } finally {
    if (version === schoolTypeVersion) ['pref', 'city', 'gaiku', 'draw-school'].forEach(function (id) { document.getElementById(id).disabled = false; });
  }
}
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('[data-school-type]').forEach(function (button) {
    button.addEventListener('click', function () { switchSchoolType(button.dataset.schoolType); });
  });
});
