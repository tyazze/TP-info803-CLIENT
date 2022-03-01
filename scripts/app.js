
// Utilitary functions
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
/*
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
  error: function(){
    alert("fail");
  },
});*/

// Initialize and add the map
var directionsService;
var directionsRenderer;
var map;
    
function initMap() {
  // Gets the services from gmap api
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

// Calculate trip
async function calcRoute() {
  // simulate a car (here, a swiftFor2)
  var autonomy = 160;
  var chargeTime = 1;

  // get the start and end cities of the trip
  var start = document.getElementById('start').value;
  var end = document.getElementById('end').value;

  // requests for the trip
  var request = {
    origin: start,
    destination: end,
    travelMode: 'DRIVING'
  };

  // var for born placing
  var neededBornCoordList = [];

  var distance = 0;

  // use the service with the request
  await directionsService.route(request, function(result, status) {
    if (status == 'OK') {
      var distanceSinceLastRecharge = 0;
      directionsRenderer.setDirections(result);
      // run through the route section
      result.routes[0].legs.forEach(leg => {
        console.log("start : " + leg.start_location);
        console.log("end : " + leg.end_location);
        leg.steps.forEach(step =>{
          var coordinateTmp = step.path[0].toUrlValue(6).split(',');
          // run through the route coordinates
          step.path.forEach(data => {
            // calculate the distance more accurately than the gmap api tools
            coordinate = data.toUrlValue(6).split(',');
            distance = distance + distanceCalculation(coordinate[0], coordinate[1], coordinateTmp[0], coordinateTmp[1], 'K');
            distanceSinceLastRecharge = distanceSinceLastRecharge + distanceCalculation(coordinate[0], coordinate[1], coordinateTmp[0], coordinateTmp[1], 'K');
            coordinateTmp = coordinate;
            // when half the autonomy is reached, save the coordinates for waypoint placement
            if (distanceSinceLastRecharge > (autonomy - Math.floor(autonomy/2))) {
              neededBornCoordList.push(coordinate);
              distanceSinceLastRecharge = 0;
            }
          });
        });
      });
    }
  });

  // var for waypoint placing
  var born;
  var waypoints = [];

  // for each saved coordinate, will try and find a born as close as possible comprised in half the autonomy radius of the chosen car
  for (const bornCoord of neededBornCoordList) {
    born = await bornsRecuperation(bornCoord, Math.floor(autonomy/2)*1000); //x1000 is needed for conversion from km to m

    // coordinates for the gmap api
    var bornLatLng = {lat: parseInt(born[0]), lng: parseInt(born[1])};
    // waypoint for the gmap api
    waypoints.push({
      location: bornLatLng,
      stopover: true,
    });
  }
                        
  // new request to add the waypoints
  // requests for the trip
  var request = {
    origin: start,
    destination: end,
    travelMode: 'DRIVING',
    waypoints: waypoints
  };

  // use the service with the request
  await directionsService.route(request, function(result, status) {
    if (status == 'OK') {
      distance = 0;
      directionsRenderer.setDirections(result);
      result.routes[0].legs.forEach(leg => {
        distance = distance + leg.distance.value;
      });
    }
  });

  distance = Math.floor(distance/1000);
  console.log(distance);
  durationCalculation(distance, autonomy, chargeTime);
}

// function to use the REST service to get the borns
async function bornsRecuperation(coordinate, range){
  const response = await fetch('https://opendata.reseaux-energies.fr/api/records/1.0/search/?dataset=bornes-irve&q=&sort=-dist&geofilter.distance=' + coordinate[0] + '%2C+' + coordinate[1] + '%2C+' + range);
  const data = await response.json();
  return data.records[0].fields.geo_point_borne;
}

// function to use the REST service to get the time needed
const durationCalculation = async (distance, autonomy, chargeTime) => {
  const response = await fetch('http://localhost:8080/REST-1.0-SNAPSHOT/api/travel-duration/' + chargeTime + '&' + autonomy + '&' + distance);
  const data = await response.json();
  document.getElementById("calculationResult").innerHTML = "Durée estimée du trajet choisi : " + data.duration + " heures";
}