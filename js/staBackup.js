/**
 * STA Rider Bus App
 *
 * CSCD378
 * TJ Breitenfeldt, Drew Bosco, Tatyana Hubbard
*/

var lat = 47.65706;
var lon = -117.42415;

$(document).ready(init);


function init () {
    getLocation();
    $("#allRoutsButton").click(getAllRouts);
    $("#stopIDTextbox").keypress(submitOnEnter);
}//end function


function submitOnEnter(event) {
    let enterKey = 13;

    if (event.which == enterKey) {
        getAllRouts(event);
    }//end if
}//end function


function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, processError);
    
    } else { 
        console.log("This broswer does not support geolocation");
        getDefaultMap();
    }//end if
}//end function


function showPosition(position) {
    lat = position.coords.latitude;
    lon = position.coords.longitude;

    let nearestStopsURL = "https://transit.land/api/v1/stops?lat=" + lat + "&lon=" + lon + "&r=600&sort_key=name";
    $.get(nearestStopsURL, function(data) {getNearestStops(data, false)}, "json");
}//end function


function processError(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            getDefaultMap();
            $("#upcomingBusRegion").html("<input type='button' value='Show your Current Location' id='showLocationButton'>");
            $("#showLocationButton").click(getLocation);
            break;
        case error.POSITION_UNAVAILABLE:
            console.log("Location information is unavailable.");
            getDefaultMap();
            break;
        case error.TIMEOUT:
            console.log("The request to get user location timed out.");
            getDefaultMap();
            break;
        case error.UNKNOWN_ERROR:
            console.log("An unknown error occurred.");
            getDefaultMap();
            break;
    }//end if
}//end function


//get upcoming bus information.
//Grab the top two bus stops if aplicable, the results are sorted by name, so the two stops should have the same name for going north bound and south bound for example
//get the current time, then take that time and add 1 hour, use that time window to get the busses from the schedule 
function getNearestStops(data) {
    let tempData = data;
    getMap(tempData);
    
    let date = new Date();
    let currentTime = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    let oneHourFromNow = (date.getHours() + 1) + ":" + date.getMinutes() + ":" + date.getSeconds();
    let scheduleURL = "";
    let stopsMax = 0;
    let routeMap = {};
    let stopMap = {};
    let schedule = data["stops"];

    if (schedule.length >= 2) {
        stopsMax = 2;
        scheduleURL = "https://transit.land/api/v1/schedule_stop_pairs?destination_onestop_id=" + schedule[0]["onestop_id"] + "," + schedule[1]["onestop_id"] +
                "&origin_departure_between=" + currentTime + "," + oneHourFromNow + "&sort_key=trip_headsign";
    } else if (schedule.length == 1) {
        stopsMax = 1;
        scheduleURL = "https://transit.land/api/v1/schedule_stop_pairs?destination_onestop_id=" + schedule[0]["onestop_id"] +
                "&origin_departure_between=" + currentTime + "," + oneHourFromNow + "&sort_key=trip_headsign";
    }//end else if

    //loop through the stop or stops, 2 at max, and get bus numbers and stop names to be passed into getUpcomingBusInformation
    //This information can only be found in the stops data, the schedule data does not include bus numbers or stop names 
    for (let index = 0; index < stopsMax; index++) {
        let routes = schedule[index]["routes_serving_stop"];
        let stopID = schedule[index]["onestop_id"];
        stopMap[stopID] = schedule[index]["tags"]["stop_desc"];

        //create route map of bus numbers to pass into getUpcomingBusInformation 
        for (let route of routes) {
            let routeID = route["route_onestop_id"];
            let busNumber = route["route_name"];
            routeMap[routeID] = busNumber;
        }//end for loop
    }//end for loop
    
    $.get(scheduleURL, function(data) {getUpcomingBusses(data, routeMap, stopMap);}, "json");
}//end function


//format data, then get schedule info
//Transit land returns extra routes that look like duplicates of other routes except the times are slightly different.
//so remove duplicate routes is used to sifen the routes down to one a peace 
function getUpcomingBusses(data, routeMap, stopMap) {
    let scheduleInfo = data["schedule_stop_pairs"];

        if (scheduleInfo.length > 0) {
        removeDuplicateRoutesFromSchedule(scheduleInfo);
        outputScheduleInformation(data, routeMap, stopMap, "upcomingBusRegion");
    } else {
        $("#getLocationButton").off();
        $("#upcomingBusRegion").html("<p>No upcoming busses</p>");
    }//end else }
}//end function 

//format the given routes to remove duplicate entries
//An algorithm is used to sifen down the results to just one copy of each route, expects the data to be sorted by trip_headsign (name of route)
function removeDuplicateRoutesFromSchedule(scheduleInfo) {
    if (scheduleInfo.length > 0) {
        let currentRouteName = scheduleInfo[scheduleInfo.length-1]["trip_headsign"];

        //remove all duplicate routes
        for (let index = scheduleInfo.length-2; index >= 0; index--) {
            let temp = scheduleInfo[index]["trip_headsign"];
    
            if (temp == currentRouteName) {
                scheduleInfo.splice(index, 1);
            } else {
                currentRouteName = temp;
            }//end else
        }//end for loop
    }//end if
}//end function


//Output the schedule information for given transit land schedule json reply 
//Expects a stop map for the stop names, and a bus map for the bus numbers.
//output the results into the region of the given ID
function outputScheduleInformation(data, routeMap, stopMap, outputRegionID) {
    let scheduleInfo = data["schedule_stop_pairs"];
    let text = "";

    if (scheduleInfo.length > 0) {
        //get bus information in a human readable format
        for (let route of scheduleInfo) {
            let timeString = route["destination_arrival_time"];
            let time = getLocaleTime(timeString);
            let stopName = stopMap[route["destination_onestop_id"]];
            let routeNumber = routeMap[route["route_onestop_id"]];
            let routeName = route["trip_headsign"];

            text += stopName + "<br>";
            text += routeNumber + ", " + routeName + ", arives at " + time + "<br>";
        }//end for loop

        text = "<p>" + text + "</p>";
    } else {
        text = "<p>No schedule information</p>";
    }//end else

    $("#" + outputRegionID).html(text);
}//end function


//Converts 24 hour time into a time generated based on the users locale settings, generally 12 hour 
function getLocaleTime(timeString) {
    let temp = timeString.split(":");
    let date = new Date();
    let time = "";

    date.setHours(parseInt(temp[0], 10), parseInt(temp[1], 10), parseInt(temp[2], 10));
    time = date.toLocaleTimeString();
    return time;
}//end function


//  This getAllRoutes function will take the value entered in the Stop ID textbox, run it through php code to parse our stop.txt file, then use
//    a callback that will run that code through some api calls to get the exact stop the code relates to, get it's onestop id, then use that 
//  onestop id to make an api call to get all the routes that stop there.
function getAllRouts(event) {
    let code = $('#stopIDTextbox').val();
    let regex = /^[0-9]{1,6}$/;

    if (regex.test(code)) {
        let map = {stop_code: code};

        let request = $.ajax({
            method: "GET",
            url: "stopIdAPI/processStopCode.php",
            data: map,
            success: gotStopFromCode,
            error: processInvalidStopCode,
            dataType: "text"
        });
    } else {
        $("#errorRegion").html("<p>Invalid format for code, please enter a bus stop ID");
        setTimeout(function() {$("#errorRegion").html("");}, 4000);
    }//end else
}//end function 


//called only if given an invalid code
function processInvalidStopCode(error) {
        $("#errorRegion").html("<p>Invalid code, that stop ID does not exists");
        setTimeout(function() {$("#errorRegion").html("");}, 4000);
}//end function


//Grab the stop code from the user and varify the data
//Then call to our private API to get the stop name from the stop code
function gotStopFromCode(data){
    let stop_desc = data;
    let sd = encodeURIComponent(stop_desc);
    let getRoutesByDescURL = "https://transit.land/api/v1/stops?tag_key=stop_desc&tag_value=" + sd;
    $.get(getRoutesByDescURL, getRoutesFromCode, "json");
}//end function


//Expects the data to be the stop array returned from a transit.land api call.
//depends on there being one stop 
//Get the schedule information and on callback, generate a button for each route to get its schedule info
function getRoutesFromCode(data) {
    let routeMap = {};
    let schedule = data["stops"];
    let routes = schedule[0]["routes_serving_stop"];
    scheduleURL = "https://transit.land/api/v1/schedule_stop_pairs?destination_onestop_id=" + schedule[0]["onestop_id"];

    let stopID = schedule[0]["onestop_id"];
    let stopName = schedule[0]["tags"]["stop_desc"];
    $("#routesForStopHeaderRegion").html("<h4>" + stopName + "</h4>");

    //create route map of bus numbers to pass into outputScheduleInformation
    for (let route of routes) {
        let routeID = route["route_onestop_id"];
        let busNumber = route["route_name"];
        routeMap[routeID] = busNumber;
    }//end for loop

    $.get(scheduleURL, function(data) {populateBusRouteButtons(data, routeMap, stopID, stopName);}, "json");
}//end function


//Create a button for each route that serves the given stop
//Bind each button to getScheduleInformation
function populateBusRouteButtons(data, routeMap, stopID, stopName) {
    //clear the busButtonsRegion if necessary
    if ($("#busButtonsRegion").html().length != 0) {
        $("#busButtonsRegion").empty();
    }//end if

    let scheduleInfo = data["schedule_stop_pairs"];
    let routeIDs = Object.keys(routeMap);

    removeDuplicateRoutesFromSchedule(scheduleInfo);

    for (let route of scheduleInfo) {
        let routeID = route["route_onestop_id"];
        let routeNumber = routeMap[routeID];
        let routeName = route["trip_headsign"];
        let busDescription = routeNumber + ", " + routeName;
        let button = "<input type='button' id='" + routeID +  "' value='" + busDescription + "'>";

        $("#busButtonsRegion").append(button);
        $("#" + routeID).click(function(event) {getScheduleInformation(event, routeID, routeNumber, stopID, stopName);});
    }//end for loop
}//end function


//Get the schedule info from transit land for a spacific stop and route
function getScheduleInformation(event, routeID, routeNumber, stopID, stopName) {
    let routeMap = {};
    let stopMap = {};
    scheduleURL = "https://transit.land/api/v1/schedule_stop_pairs?destination_onestop_id=" + stopID +
            "&route_onestop_id=" + routeID + "&sort_key=destination_arrival_time";

    routeMap[routeID] = routeNumber;
    stopMap[stopID] = stopName;
    $.get(scheduleURL, function(data) {outputScheduleInformation(data, routeMap, stopMap, "busScheduleRegion");}, "json");
}//end function


/* New Code from Tatyana: The default map should be used to show Spokane when an error or the location isn't given. 12/3-4

 Notes:
     The map's zoom may not be as perfect as we wanted it to be, so we can change that if need be.
    The getMap function is called within the getStops method, with the same data being given to the getMap. 
    We may want to move where the getMap function is called, but it works as far as I have tested it.
*/
function getDefaultMap() {
    mapboxgl.accessToken = 'pk.eyJ1IjoiY29kZW5pbmphcyIsImEiOiJjam95d3gzbHAwMXhvM3BvOXUwdTdsZ3huIn0.lTnB1IYFYf3TufCSrlYJ_w';

    map = new mapboxgl.Map(
        {
            container: 'map', // container id
            style: 'mapbox://styles/mapbox/streets-v9', // stylesheet location
            center: [-117.42415, 47.65706], // starting position [lng, lat]
            zoom: 10 // starting zoom
        });
}//end function 


function getMap(data) {
    mapboxgl.accessToken = 'pk.eyJ1IjoiY29kZW5pbmphcyIsImEiOiJjam95d3gzbHAwMXhvM3BvOXUwdTdsZ3huIn0.lTnB1IYFYf3TufCSrlYJ_w';
     
    map = new mapboxgl.Map(
        {
            container: 'map', // container id
            style: 'mapbox://styles/mapbox/streets-v9', // stylesheet location
            center: [lon, lat], // starting position [lng, lat]
            zoom: 15 // starting zoom
        });

    let schedule = data["stops"];
    if(schedule != null)
    {
        let schedLength = schedule.length;

        for (let index = 0; index < schedLength; index++)
        {
            var geojson = {
                type: 'FeatureCollection',
                features: [{
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: schedule[index]["geometry"]["coordinates"],
                  },
                  properties: {
                    name: schedule[index]["name"],
                    onestop_id: schedule[index]["onestop_id"]
                  }
                }]
              };

              geojson.features.forEach(function(marker) {

                // create a HTML element for each feature
                var el = document.createElement('div');
                el.className = 'marker';
              
                // make a marker for each feature and add to the map
                new mapboxgl.Marker(el)
                .setLngLat(marker.geometry.coordinates)
                .addTo(map);
              });
        }
    }
}//end function



