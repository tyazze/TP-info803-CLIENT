function distanceCalculation(lat1, lon1, lat2, lon2, unit) {
  if ((lat1 == lat2) && (lon1 == lon2)) {
    return 0;
  }
  else {
    var radlat1 = Math.PI * lat1/180;
    var radlat2 = Math.PI * lat2/180;
    var theta = lon1-lon2;
    var radtheta = Math.PI * theta/180;
    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    if (dist > 1) {
      dist = 1;
    }
    dist = Math.acos(dist);
    dist = dist * 180/Math.PI;
    dist = dist * 60 * 1.1515;
    if (unit=="K") { dist = dist * 1.609344 }
    if (unit=="N") { dist = dist * 0.8684 }
    return dist;
  }
}

// Soap
    /*$.soap({
        url: 'http://localhost:8000/',
        method: 'autonomy',

        data: {
            car: 'SmartFor2'
        },

        success: function (soapResponse) {
            // do stuff with soapResponse
            // if you want to have the response as JSON use soapResponse.toJSON();
            // or soapResponse.toString() to get XML string
            // or soapResponse.toXML() to get XML DOM
            log(soapResponse.toJSON());
        },
        error: function (SOAPResponse) {
            // show error
        }
    });*/

    var request_url = 'http://localhost:8000/autonomy?name=SmartFor2';
    var jdata = 'none'
    $.ajax( {
      type:'Get',
      url:request_url,
      dataType: "html",                
      crossDomain : true,
      success:function(data) {
    alert(data);
      },
      error: function()
      {
      alert("fail");
      },

    });

    // Initialize and add the map
    var directionsService;
    var directionsRenderer;
    var map;
    
    function initMap() {
        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer();
        var lyon = new google.maps.LatLng(45.764, 4.835);
        var mapOptions = {
            zoom:7,
            center: lyon
        }
        map = new google.maps.Map(document.getElementById('map'), mapOptions);
        directionsRenderer.setMap(map);
    }

    function calcRoute() {
        var autonomy = 160;
        var chargeTime = 1;

        var start = document.getElementById('start').value;
        var end = document.getElementById('end').value;
        var request = {
            origin: start,
            destination: end,
            travelMode: 'DRIVING'
        };
        directionsService.route(request, function(result, status) {
        if (status == 'OK') {
            directionsRenderer.setDirections(result);
            var distance = 0;
            result.routes[0].legs.forEach(leg => {
                leg.steps.forEach(step =>{
                    //distance = distance + step.distance.value;
                    var coordinateTmp = step.path[0].toUrlValue(6).split(',');
                    var born;
                    var borns = [];
                    var distanceSinceLastRecharge = 0;
                    step.path.forEach(data => {
                      coordinate = data.toUrlValue(6).split(',');
                      distance = distance + distanceCalculation(coordinate[0], coordinate[1], coordinateTmp[0], coordinateTmp[1], 'K');
                      distanceSinceLastRecharge = distanceSinceLastRecharge + distanceCalculation(coordinate[0], coordinate[1], coordinateTmp[0], coordinateTmp[1], 'K');
                      coordinateTmp = coordinate;
                      if (distanceSinceLastRecharge >= autonomy - Math.floor(autonomy/10)) {
                        born = await nom(coordinate);
                        console.log("test" + born);
                        
                        var bornLatLng = {lat: parseInt(born[1]), lng: parseInt(born[0])};
                        
                        console.log(bornLatLng);
                        
                        new google.maps.Marker({
                          position: bornLatLng,
                          map,
                          title: "born",
                        });
                        borns.push([born[0], born[1]]);
                        console.log(distanceSinceLastRecharge);
                        distanceSinceLastRecharge = 0;
                      }
                    });
                });
            });
            distance = Math.floor(distance);
            durationCalculation(distance, autonomy, chargeTime);
        }
        });
    }

    /*const bornsRecuperation = async (coordinate) => {
      const response = await fetch('https://opendata.reseaux-energies.fr/api/records/1.0/search/?dataset=bornes-irve&q=&facet=region&geofilter.distance=' + coordinate[0] + '%2C+' + coordinate[1] + '%2C+10000');
      const data = await response.json(); //extract JSON from the http response
      console.log(data);
      return data.records[0].geometry.coordinates;
    }*/
    async function nom(coordinate){
      const response = await fetch('https://opendata.reseaux-energies.fr/api/records/1.0/search/?dataset=bornes-irve&q=&facet=region&geofilter.distance=' + coordinate[0] + '%2C+' + coordinate[1] + '%2C+10000');
      const data = await response.json(); //extract JSON from the http response
      return data.records[0].geometry.coordinates;
    }

    const durationCalculation = async (distance, autonomy, chargeTime) => {
      const response = await fetch('http://localhost:8080/REST-1.0-SNAPSHOT/api/travel-duration/' + chargeTime + '&' + autonomy + '&' + distance);
      const data = await response.json(); //extract JSON from the http response
      document.getElementById("calculationResult").innerHTML = "Durée estimée du trajet choisi : " + data.duration + " heures";
  }