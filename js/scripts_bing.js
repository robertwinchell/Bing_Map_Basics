/**
 * scripts.js
 *
 * Computer Science 50
 * Problem Set 8
 *
 * Global JavaScript.
 */

var map = null, infobox, dataLayer;
var nw;
var se;

// execute when the DOM is fully loaded
$(function() {

    // styles for map
    // options for map
    // get DOM node in which map will be instantiated
    var canvas = $("#map-canvas").get(0);

    // instantiate map
	map = new Microsoft.Maps.Map(canvas, {
			center: new Microsoft.Maps.Location(42.3770, -71.1256),
			credentials: 'Your Bing Maps Key', 
			zoom: 13,
			showMapTypeSelector:false
			//mapTypeId: Microsoft.Maps.MapTypeId.birdseye,
			//showScalebar: false
		});
		
	map.getZoomRange = function () {
		return { max: 14, min: 5 };
	};
	
	//Microsoft.Maps.MapTypeId.auto: automatic, Microsoft.Maps.MapTypeId.road: road, Microsoft.Maps.MapTypeId.aerial: aerial, Microsoft.Maps.MapTypeId.birdseye: birdeye  
	map.setView({
		mapTypeId : Microsoft.Maps.MapTypeId.road
	});

	dataLayer = new Microsoft.Maps.EntityCollection();
	map.entities.push(dataLayer);

	var infoboxLayer = new Microsoft.Maps.EntityCollection();
	map.entities.push(infoboxLayer);

	infobox = new Microsoft.Maps.Infobox(new Microsoft.Maps.Location(0, 0), { 
		visible: false, 
		offset: new Microsoft.Maps.Point(0, 20) 
	});
	infoboxLayer.push(infobox);	
	
    // configure UI once Google Map is idle (i.e., loaded)
	setTimeout(function() {
		configure();
	}, 100);
});

/**
 * Adds marker for place to map.
 */
function addMarker(place) {
	var pin = new Microsoft.Maps.Pushpin(new Microsoft.Maps.Location(place.latitude, place.longitude));
	pin.Title = place.place_name;
	pin.Description = place.place_name;
	Microsoft.Maps.Events.addHandler(pin, 'click', displayInfobox);
	dataLayer.push(pin);
}

function displayInfobox(e) {
	if (e.targetType == 'pushpin') {
		infobox.setLocation(e.target.getLocation());
		infobox.setOptions({ 
			visible: true, 
			title: e.target.Title, 
			description: e.target.Description 
		});
	}
} 
/**
 * Configures application.
 */
function invalidBounds() {
	var invalid = false,
		mapBounds = map.getBounds();
	
	if(mapBounds) {
		var nw = mapBounds.getNorthwest(),
			se = mapBounds.getSoutheast();
			
		invalid = !ratio_bounds || !ratio_bounds.contains(nw) || !ratio_bounds.contains(se);
	}
	
	return invalid;
}

function calculateBounds() {
	var ratio = 2,
		mapBounds = map.getBounds();
	
	if(mapBounds) {
		var center = mapBounds.center,
			nw = mapBounds.getNorthwest(),
			se = mapBounds.getSoutheast(),
			dataWidth = Math.abs(nw.longitude - se.longitude) * ratio,
			dataHeight = Math.abs(se.latitude - nw.latitude) * ratio;
		
		var new_nw = new Microsoft.Maps.Location(center.latitude + (dataHeight / 2), center.longitude - (dataWidth / 2)),
			new_se = new Microsoft.Maps.Location(center.latitude - (dataHeight / 2), center.longitude + (dataWidth / 2));
		
		ratio_bounds = Microsoft.Maps.LocationRect.fromCorners(new_nw, new_se);
	}
}
				
function configure()
{
	Microsoft.Maps.Events.addThrottledHandler(map, "viewchangeend", function(arg) {
		
		if(invalidBounds()) {
			removeMarkers();
			update();
		}
		
	}, 100);

    // configure typeahead
    // https://github.com/twitter/typeahead.js/blob/master/doc/jquery_typeahead.md
    $("#q").typeahead({
        autoselect: true,
        highlight: true,
        minLength: 1
    },
    {
        source: search,
        templates: {
            empty: "no places found yet",
            suggestion: _.template("<p><%- place_name %>, <%- admin_name1 %></p>")
        }
    });

    // re-center map after place is selected from drop-down
    $("#q").on("typeahead:selected", function(eventObject, suggestion, name) {

        // ensure coordinates are numbers
        var latitude = (_.isNumber(suggestion.latitude)) ? suggestion.latitude : parseFloat(suggestion.latitude);
        var longitude = (_.isNumber(suggestion.longitude)) ? suggestion.longitude : parseFloat(suggestion.longitude);

        // set map's center
		map.setView({
			center: new Microsoft.Maps.Location(latitude, longitude)
		});

        // update UI
        update();
    });

    // hide info window when text box has focus
    $("#q").focus(function(eventData) {
		//!!!
		infobox.setOptions({ 
			visible: false
		});
		//!!!
    });

    // re-enable ctrl- and right-clicking (and thus Inspect Element) on Google Map
    // https://chrome.google.com/webstore/detail/allow-right-click/hompjdfbfmmmgflfjdlnkohcplmboaeo?hl=en
    document.addEventListener("contextmenu", function(event) {
        event.returnValue = true; 
        event.stopPropagation && event.stopPropagation(); 
        event.cancelBubble && event.cancelBubble();
    }, true);

    // update UI
    update();

    // give focus to text box
    $("#q").focus();
}


/**
 * Removes markers from map.
 */
function removeMarkers()
{
	dataLayer.clear();
}

/**
 * Searches database for typeahead's suggestions.
 */
function search(query, cb)
{
    // get places matching query (asynchronously)
    var parameters = {
        geo: query
    };
    $.getJSON("search.php", parameters)
    .done(function(data, textStatus, jqXHR) {

        // call typeahead's callback with search results (i.e., places)
        cb(data);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {

        // log error to browser's console
        console.log(errorThrown.toString());
    });
}

/**
 * Updates UI's markers.
 */
function update() 
{
    // get map's bounds
	calculateBounds();
    var r_nw = ratio_bounds.getNorthwest();
    var r_se = ratio_bounds.getSoutheast();

    // get places within bounds (asynchronously)
    var parameters = {
        ne: r_nw.latitude + "," + r_se.longitude,
        q: $("#q").val(),
        sw: r_se.latitude + "," + r_nw.longitude
    };
	
	infobox.setOptions({ 
		visible: false
	});				
	
    $.getJSON("update.php", parameters)
    .done(function(data, textStatus, jqXHR) {

        // remove old markers from map
        removeMarkers();

        // add new markers to map
        for (var i = 0; i < data.length; i++)
        {
            addMarker(data[i]);
        }
     })
     .fail(function(jqXHR, textStatus, errorThrown) {

         // log error to browser's console
         console.log(errorThrown.toString());
     });
};
