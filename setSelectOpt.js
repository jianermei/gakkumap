/************************************************************
	select box のオプションを設定する
*************************************************************/

// Ignore responses for selections that have since changed.
var cityLoadVersion = 0;
var schoolLoadVersion = 0;
var schoolCityCodes = {};

// A designated city includes its wards; a ward or ordinary city matches itself.
function getSchoolCityCodes(areas, selectedArea) {
  return areas.filter(function (area) {
    return area.code === selectedArea.code ||
      (/市$/.test(selectedArea.label) && /区$/.test(area.label) &&
       area.label.indexOf(selectedArea.label) === 0);
  }).map(function (area) { return area.code; });
}

function resetSchoolSelection() {
  schoolLoadVersion++;
  A27Xml = null;
  $('#gaiku').html('<option value="00" selected>--選択--</option>');
  deletePoly();
}

//都道府県名とコードの設定
function setPref(){
  $.ajax({
    type: "GET",
    url: "./PrefCd.xml",
    dataType: "xml",
    success: function(xml){
			//都道府県名・コードを抽出し、SELECT ボックスに設定
		  $(xml).find('ksjc\\:PrefCd').each(function(){
		    $(this).find("codelabel").each(function(){
		    	wopt = document.createElement('option');
		    	wopt.setAttribute('value', $(this).attr("code"));
		    	$(wopt).append($(this).attr("label"));
					$('#pref').append(wopt);
		    });
		  });
			$('#pref').off('change', selectCity).on('change', selectCity);
		},
    error : function(){
    					errorMsg("都道府県名とコード処理");
    				}
	});
}
//市区町村名とコードの設定
function setCity(){
  var requestedPrefCode = prefCode;
  var loadVersion = ++cityLoadVersion;
  $.ajax({
    type: "GET",
    url: "./AdminAreaCd.xml",
    dataType: "xml",
    success: function(xml){
      if (loadVersion !== cityLoadVersion) return;
      var areas = [];
      $(xml).find('codelabel').each(function () {
        var code = $(this).attr('code');
        if (code.substr(0, 2) === requestedPrefCode) {
          areas.push({code: code, label: $(this).attr('label')});
        }
      });
      schoolCityCodes = {};
      areas.forEach(function (area) {
        schoolCityCodes[area.code] = getSchoolCityCodes(areas, area);
      });
			$("#city").html('');
			wopt = document.createElement('option');
			wopt.setAttribute('value', '00');
			wopt.setAttribute("selected", "selected");
			$(wopt).append('--選択--');
			$("#city").append(wopt);
			//市区町村名・コードを抽出し、SELECT ボックスに設定
		  $(xml).find('ksjc\\:C002').each(function(){
		    $(this).find("codelabel").each(function(){

          if ($(this).attr("code").substr(0,2) === requestedPrefCode){
			    	wopt = document.createElement('option');
			    	//市区町村コード
			    	cityCode = $(this).attr("code");	//市区町村コード
			    	wopt.setAttribute('value', cityCode);
			    	//市区町村名
			    	cityName = $(this).attr("label");
						splitCityName(cityName);	//市区町村名を分割
			    	$(wopt).append(cityNameL);
						$('#city').append(wopt);
					}
		    });
		  });
			$('#city').off('change', selectGaiku).on('change', selectGaiku);
		},
    error : function(){
      if (loadVersion !== cityLoadVersion) return;
    					errorMsg("市区町村名とコード処理");
    				}
	});
}

//学校の設定
function setSchool(){
  var requestedCityCodes = schoolCityCodes[cityCode] || [cityCode];
  var requestedCityName = cityName;
  var file = 'A27-23_' + prefCode + '.geojson';
  var loadVersion = ++schoolLoadVersion;
  $('#output').text('学校データを読み込み中…');
  $.ajax({
    type: 'GET', url: './map_data/' + file, dataType: 'json',
    success: function(data) {
      if (loadVersion !== schoolLoadVersion) return;
      try {
        $('#output').text('');
        loadModernSchoolOptions(data, requestedCityCodes, requestedCityName);
        A27Xml = data;
      } catch (error) {
        A27Xml = null;
        $('#output').text('学校データの形式を確認してください：' + error.message);
      }
    },
    error: function() {
      if (loadVersion !== schoolLoadVersion) return;
      A27Xml = null;
      $('#output').text('学校データ map_data/' + file + ' を読み込めません。ファイルの配置を確認してください。');
    }
  });
}

//町丁・字名とコードの設定
function setGaiku(dir,file){
  $.ajax({
    type: "GET",
    url: "/web/GoogleMap/V3/myMap/place/xml/" + dir + file,
    dataType: "xml",
    success: function(xml){
			h22kaXml = xml;	//xml退避
			$("#gaiku").html('');
			wopt = document.createElement('option');
			wopt.setAttribute('value', '00');
			wopt.setAttribute("selected", "selected");
			$(wopt).append('--選択--');
			$("#gaiku").append(wopt);
			//町・字名・コードを抽出し、SELECT ボックスに設定
			var val;
			var mojiName;
			var mojiCode;
		  $(xml).find("GeometricFeature").each(function(){
		  	val = $(this).attr('id');
		    $(this).find("Property").each(function(){
		    	if ($(this).attr("propertytypename") == 'MOJI')    {mojiName = $(this).text();} //町字名（丁目）
		    	if ($(this).attr("propertytypename") == 'KEY_CODE'){mojiCode = $(this).text();} //町字コード（丁目）
		    });
		  	wopt = document.createElement('option');
		  	wopt.setAttribute('value', val);
		  	$(wopt).append(mojiName);
				$("#gaiku").append(wopt);
			});
			//$('#gaiku').bind('change', selectCoords);
		},
    error : function(){
    				  errorMsg("町丁・字名とコード処理");
    				}
	});
}

function selectCity(){
	//都道府県コード
	prefCode = $('#pref option:selected').val();
	prefName = $('#pref option:selected').text();
  cityLoadVersion++;
  cityCode = '00';
  $('#city').html('<option value="00" selected>--選択--</option>');
  resetSchoolSelection();
  if (prefCode !== '00') setCity();
}

function selectGaiku(){
	//都道府県+市区町村コード
	cityCode = $('#city option:selected').val();
	cityName = $('#city option:selected').text();
	resetSchoolSelection();
	if (cityCode !== '00') setSchool();
}
/*
function selectCoords(){
	//町字名・コード
	gaikuCode = $('#gaiku option:selected').val();
	gaikuName = $('#gaiku option:selected').text();
	bdCoords.length = 0;
  $(h22kaXml).find("GeometricFeature").each(function(){
  	if ($(this).attr('id') == gaikuCode){
     //境界座標
    	$(this).find("Geometry").each(function(){
	    	$(this).find("Coordinates").each(function(){
	    		var coords = $(this).text();
	    		bdCoordsSet(coords);
	    	});
    	});
    }
	});
}
*/
//コードを都道府県と市区町村に分割
function splitCityCode(cCode){
	cityCodeU = cCode.substr(0,2);	//都道府県コード
	cityCodeL = cCode.substr(2,3);	//市区町村コード
}
//名称を都道府県と市区町村に分割
function splitCityName(cName){

	var pos = cName.indexOf("県");
	if (pos == -1){pos = cName.indexOf("都");}
	if (pos == -1){pos = cName.indexOf("道");}
	if (pos == -1){pos = cName.indexOf("府");}
	if (pos == -1){
		alert("Program Error ! -- 都道府県名 : " + cName);
		return false;
	}
	cityNameU = cName.substr(0,pos + 1);	//都道府県名
	cityNameL = cName.substr(pos + 1, cName.length - pos - 1);	//市区町村名
}
//座標を配列へ [[緯度,経度],[緯度,経度],...,[緯度,経度]]
function bdCoordsSet(coords){
	var bLatlng = coords.split(" ");
	for (var i = 0; i < bLatlng.length; i++) {
		var gpslatlng = bLatlng[i].split(",");
		bdCoords[i] = new Array();
		bdCoords[i][0] = gpslatlng[1];
		bdCoords[i][1] = gpslatlng[0];
	}
}

function errorMsg(msg){
	alert("Error Found ! -- " + msg);
}
