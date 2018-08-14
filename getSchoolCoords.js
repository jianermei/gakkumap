/************************************************************

*************************************************************/

function getGaikuCoords(){
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
	    		gbdCoordsSet(coords);
	    	});
    	});
    }
	});
	//gDebug();
	renderGaiku();
}

//座標を配列へ [[緯度,経度],[緯度,経度],...,[緯度,経度]]
function gbdCoordsSet(coords){
	var bLatlng = coords.split(" ");
	for (var i = 0; i < bLatlng.length; i++) {
		var gpslatlng = bLatlng[i].split(",");
		bdCoords[i] = new Array();
		bdCoords[i][0] = gpslatlng[1];
		bdCoords[i][1] = gpslatlng[0];
	}
}

function gDebug(){
	$("#output").text('');
	$("#output").append("●" + gaikuName + "(" + gaikuCode + ")" + "<br />");
	for(var i = 0; i < bdCoords.length; i++){
  	$("#output").append(bdCoords[i][0] + "," + bdCoords[i][1] + "<br />");
	}
}
function renderGaiku(){
	deletePoly();
	sArea = new Array();
	sLine = new Array();
  // 境界の設定	
	bounds = new google.maps.LatLngBounds();
	var polyCoords = new Array();
	for (var i = 0; i < bdCoords.length; i++) {
		var latlng = new google.maps.LatLng( bdCoords[i][0], bdCoords[i][1] );
		polyCoords[i] = latlng;
		bounds.extend(latlng);
	}
	GdispPoly(polyCoords,'#FF0000');
	//map.fitBounds(bounds);
}

function GdispPoly(polyCoords,fcolor){
	//ラジオボタン選択値を取得
	/*
	for(i = 0; i < form1.ptype.length; i++){ 	//全てのラジオボタンをスキャン 
		if(form1.ptype[i].checked) { 						//チェックされていたら 
			selp = parseInt(form1.ptype[i].value);//それが基数 
			break;
		}
 	}
 	*/
 	selp = $("input[type=radio]:checked").val();
	if (selp == 1){
	  adminArea = new google.maps.Polygon({
	    paths: polyCoords,
	    strokeColor: '#FF0000',
	    strokeOpacity: 0.8,
	    strokeWeight: 3,
	    fillColor: fcolor,
	    fillOpacity: 0.1
	  });
  	adminArea.setMap(map);
  	sArea.push(adminArea);
	}else{
	  adminLine = new google.maps.Polyline({
	    path: polyCoords,
	    strokeColor: "#FF0000",
	    strokeOpacity: 0.5,
	    strokeWeight: 3
	  });
		adminLine.setMap(map);
  	sLine.push(adminLine);
	}
	map.fitBounds(bounds);
}

/*
function renderGaiku(){
	deletePoly();
	sArea = new Array();
	sLine = new Array();
  // 境界の設定	
	bounds = new google.maps.LatLngBounds();
	var polyCoords = new Array();
	for (var i = 0; i < bdCoords.length; i++) {
		var latlng = new google.maps.LatLng( bdCoords[i][0], bdCoords[i][1] );
		polyCoords[i] = latlng;
		bounds.extend(latlng);
		dispPoly(polyCoords,'#FF0000');
	}
	map.fitBounds(bounds);
}
*/