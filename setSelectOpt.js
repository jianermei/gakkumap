/************************************************************
	select box のオプションを設定する
*************************************************************/

//都道府県名とコードの設定
function setPref(){
  $.ajax({
    type: "GET",
    url: "/gakkumap/PrefCd.xml",
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
			$('#pref').bind('change', selectCity);
		},
    error : function(){
    					errorMsg("都道府県名とコード処理");
    				}
	});
}
//市区町村名とコードの設定
function setCity(){
  $.ajax({
    type: "GET",
    url: "/gakkumap/AdminAreaCd.xml",
    dataType: "xml",
    success: function(xml){
			$("#city").html('');
			wopt = document.createElement('option');
			wopt.setAttribute('value', '00');
			wopt.setAttribute("selected", "selected");
			$(wopt).append('--選択--');
			$("#city").append(wopt);
			//市区町村名・コードを抽出し、SELECT ボックスに設定
		  $(xml).find('ksjc\\:C002').each(function(){
		    $(this).find("codelabel").each(function(){
		    	if (($(this).attr("code")).substr(0,2) == parseInt(prefCode)){
			    	wopt = document.createElement('option');
			    	//市区町村コード
			    	cityCode = $(this).attr("code");	//市区町村コード
			    	wopt.setAttribute('value', cityCode);
			    	//市区町村名
			    	cityName = $(this).attr("label");
						splitCityName(cityName);	//市区町村名を分割
			    	$(wopt).append(cityNameL);
						//都道府県の制限
		    		if (prefCode > "30"){
		    			wopt.setAttribute("disabled", "disabled");
		    			//console.log(wopt);
		    		}
						$('#city').append(wopt);
					}
		    });
		  });
			$('#city').bind('change', selectGaiku);
		},
    error : function(){
    					errorMsg("市区町村名とコード処理");
    				}
	});
}

//学校の設定
function setSchool(dir, file){
	$.ajax({
    type: "GET",
    url: "/gakkumap/A27-10_13.xml",
    dataType: "xml",
    success:function(xml){
			A27Xml = xml;	//xml退避
			$("#gaiku").html('');
			wopt = document.createElement('option');
			wopt.setAttribute('value', '00');
			wopt.setAttribute("selected", "selected");
			$(wopt).append('--選択--');
			$("#gaiku").append(wopt);
			//町・字名・コードを抽出し、SELECT ボックスに設定
			var val;
			$(xml).find('ksj\\:OBJ').each(function(){
					// 通学区域
					$(this).find("ksj\\:SD02").each(function(){
							// 市区町村コード
							$(this).find("ksj\\:CCD").each(function(){
									if ($(this)[0].textContent == cityCode ) {
								    	wopt = document.createElement('option');
										// 学校コード
										schoolCode = $(this).closest("ksj\\:SD02").children("ksj\\:ARE").attr("idref");
								    	wopt.setAttribute('value', schoolCode);
										// 学校名
										esn = $(this).closest("ksj\\:SD02").children("ksj\\:ESN");
										shcoolName = esn[0].textContent;
								    	$(wopt).append(shcoolName);
										$("#gaiku").append(wopt);
										console.log(shcoolName);
									}
							});
					});

			});

    },
    error : function(){
    				  errorMsg("学校の設定処理");
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
	setCity();
}

function selectGaiku(){
	//都道府県+市区町村コード
	cityCode = $('#city option:selected').val();
	cityName = $('#city option:selected').text();
	splitCityCode(cityCode);	//市区町村コードを分割
	//ディレクトリ：都道府県コード+都道府県名（漢字）
	//var xmlDir  = cityCodeU + cityNameU + "/";
	var xmlDir  = cityCodeU + "/";
	//ファイル名：h22ka + 都道府県 + 市区町村コード
	var xmlFile = "h22ka"   + cityCode + ".xml";
	// setGaiku(xmlDir,xmlFile);
	setSchool(xmlDir, xmlFile);
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
