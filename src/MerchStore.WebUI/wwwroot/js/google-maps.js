// ======================================
// GLOBAL VARIABLES
// ======================================
let map;
let directionsService, directionsRenderer;
let geocoder, placesService, distanceMatrixService;
let originAutocomplete, destinationAutocomplete;
let markers = [];
let infoWindow;
let currentUserLocation = null;
let bookmarkedPlaces = [];
let bookmarkMarkers = [];
let tempBookmarkData = null;

// ======================================
// INITIALIZATION
// ======================================
function initMap() {
    const center = { lat: 59.3293, lng: 18.0686 }; // Stockholm
    
    map = new google.maps.Map(document.getElementById("map"), {
        center: center,
        zoom: 12,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true
    });

    // Initialize all services
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({ 
        map: map,
        suppressMarkers: false 
    });
    geocoder = new google.maps.Geocoder();
    placesService = new google.maps.places.PlacesService(map);
    distanceMatrixService = new google.maps.DistanceMatrixService();
    infoWindow = new google.maps.InfoWindow();

    // Autocomplete
    originAutocomplete = new google.maps.places.Autocomplete(
        document.getElementById("origin-input")
    );
    destinationAutocomplete = new google.maps.places.Autocomplete(
        document.getElementById("destination-input")
    );

    // Get user location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentUserLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                map.setCenter(currentUserLocation);
            },
            (error) => {
                console.log("Location access denied or unavailable");
            }
        );
    }

    // Map click for reverse geocoding
    map.addListener("click", (e) => {
        document.getElementById("reverse-lat").value = e.latLng.lat().toFixed(6);
        document.getElementById("reverse-lng").value = e.latLng.lng().toFixed(6);
        reverseGeocode();
    });

    // Right-click on map to add bookmark
    map.addListener("contextmenu", (e) => {
        e.domEvent.preventDefault();
        openBookmarkModalAtLocation(e.latLng.lat(), e.latLng.lng());
    });

    // Check if URL has shared place data
    checkSharedPlace();
    
    // Load saved bookmarks
    loadBookmarks();
}

// ======================================
// TAB NAVIGATION
// ======================================
function showTab(tabName) {
    document.querySelectorAll('.api-section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// ======================================
// DIRECTIONS API FUNCTIONS
// ======================================
function calculateRoute() {
    const originPlace = originAutocomplete.getPlace();
    const destPlace = destinationAutocomplete.getPlace();

    if (!originPlace?.geometry || !destPlace?.geometry) {
        alert("Please select both origin and destination");
        return;
    }

    const request = {
        origin: originPlace.geometry.location,
        destination: destPlace.geometry.location,
        travelMode: google.maps.TravelMode[document.getElementById("travel-mode").value],
        provideRouteAlternatives: false
    };

    directionsService.route(request, (result, status) => {
        if (status === 'OK') {
            directionsRenderer.setDirections(result);
            displayRouteInfo(result);
        } else {
            document.getElementById("route-info").innerHTML = `Error: ${status}`;
        }
    });
}

function calculateAlternativeRoutes() {
    const originPlace = originAutocomplete.getPlace();
    const destPlace = destinationAutocomplete.getPlace();

    if (!originPlace?.geometry || !destPlace?.geometry) {
        alert("Please select both origin and destination");
        return;
    }

    const request = {
        origin: originPlace.geometry.location,
        destination: destPlace.geometry.location,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true
    };

    directionsService.route(request, (result, status) => {
        if (status === 'OK') {
            directionsRenderer.setDirections(result);
            let html = `<strong>Found ${result.routes.length} route(s):</strong><br><br>`;
            result.routes.forEach((route, i) => {
                const leg = route.legs[0];
                html += `<strong>Route ${i + 1}:</strong> ${leg.distance.text}, ${leg.duration.text}<br>`;
            });
            document.getElementById("route-info").innerHTML = html;
        } else {
            document.getElementById("route-info").innerHTML = `Error: ${status}`;
        }
    });
}

function displayRouteInfo(result) {
    const route = result.routes[0];
    const leg = route.legs[0];
    
    let html = `<strong>Route Details:</strong><br>`;
    html += `<strong>Distance:</strong> ${leg.distance.text}<br>`;
    html += `<strong>Duration:</strong> ${leg.duration.text}<br>`;
    html += `<strong>Start:</strong> ${leg.start_address}<br>`;
    html += `<strong>End:</strong> ${leg.end_address}<br>`;
    html += `<br><strong>Turn-by-turn Directions:</strong><br>`;
    
    leg.steps.forEach((step, i) => {
        html += `<div style="padding: 5px 0; border-bottom: 1px solid #eee;">`;
        html += `${i + 1}. ${step.instructions} <span style="color: #666;">(${step.distance.text})</span>`;
        html += `</div>`;
    });
    
    document.getElementById("route-info").innerHTML = html;
}

function getDirectionsToPlace(lat, lng, name) {
    const destination = { lat: lat, lng: lng };
    
    // Use current location or map center as origin
    const origin = currentUserLocation || map.getCenter();
    
    // Get selected travel mode
    const travelMode = document.getElementById("travel-mode").value;
    
    const request = {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode[travelMode]
    };

    directionsService.route(request, (result, status) => {
        if (status === 'OK') {
            directionsRenderer.setDirections(result);
            
            // Switch to directions tab and show info
            showTab('directions');
            document.querySelector('.tab-btn').click();
            
            const leg = result.routes[0].legs[0];
            const modeIcon = {
                'DRIVING': '🚗',
                'WALKING': '🚶',
                'BICYCLING': '🚴',
                'TRANSIT': '🚌'
            }[travelMode];
            
            let html = `<strong>${modeIcon} Route to ${name}:</strong><br>`;
            html += `<strong>Travel Mode:</strong> ${travelMode}<br>`;
            html += `<strong>Distance:</strong> ${leg.distance.text}<br>`;
            html += `<strong>Duration:</strong> ${leg.duration.text}<br>`;
            html += `<strong>From:</strong> ${leg.start_address}<br>`;
            html += `<strong>To:</strong> ${leg.end_address}<br><br>`;
            html += `<button onclick="getDirectionsToPlace(${lat}, ${lng}, '${name.replace(/'/g, "\\'")}'); return false;" style="padding: 8px 16px; margin-right: 5px;">🔄 Recalculate</button>`;
            html += `<br><br><em>💡 Tip: Change the travel mode above and click "🔄 Recalculate" to see different routes!</em>`;
            
            document.getElementById("route-info").innerHTML = html;
        } else {
            alert(`Could not calculate route: ${status}`);
        }
    });
}

// ======================================
// PLACES API FUNCTIONS
// ======================================
function searchNearbyPlaces() {
    const query = document.getElementById("places-search").value;
    const radius = parseInt(document.getElementById("places-radius").value);

    if (!query) {
        alert("Please enter a search term");
        return;
    }

    const request = {
        location: map.getCenter(),
        radius: radius,
        keyword: query
    };

    placesService.nearbySearch(request, displayPlacesWithOptions);
}

function textSearch() {
    const query = document.getElementById("text-search").value;

    if (!query) {
        alert("Please enter a search query");
        return;
    }

    const request = {
        query: query,
        fields: ['name', 'geometry', 'formatted_address', 'place_id', 'rating']
    };

    placesService.textSearch(request, displayPlacesWithOptions);
}

function displayPlacesWithOptions(results, status) {
    const resultsDiv = document.getElementById("places-results");
    
    if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
        clearMarkers();
        let html = `<strong>Found ${results.length} place(s) - Click on any option below:</strong><br><br>`;
        
        results.forEach((place, i) => {
            const placeId = place.place_id;
            const placeName = place.name;
            const placeLocation = place.geometry.location;
            const lat = placeLocation.lat();
            const lng = placeLocation.lng();
            
            html += `<div class="place-card">`;
            html += `<strong>${i + 1}. ${placeName}</strong><br>`;
            
            if (place.vicinity) {
                html += `📍 ${place.vicinity}<br>`;
            } else if (place.formatted_address) {
                html += `📍 ${place.formatted_address}<br>`;
            }
            
            if (place.rating) {
                html += `⭐ ${place.rating}<br>`;
            }
            
            html += `<div style="margin-top: 8px;">`;
            html += `<button class="action-btn" onclick='showPlaceOnMap(${lat}, ${lng}, "${placeName.replace(/'/g, "\\'")}"); return false;'>📍 Show on Map</button>`;
            html += `<button class="action-btn secondary" onclick='getDirectionsToPlace(${lat}, ${lng}, "${placeName.replace(/'/g, "\\'")}"); return false;'>🚗 Get Directions</button>`;
            html += `<button class="action-btn info" onclick='getPlaceDetails("${placeId}"); return false;'>ℹ️ More Info</button>`;
            html += `<button class="action-btn" onclick='getDistanceToPlace(${lat}, ${lng}, "${placeName.replace(/'/g, "\\'")}"); return false;'>📏 Distance</button>`;
            html += `<button class="action-btn bookmark" onclick='addBookmarkFromPlace(${lat}, ${lng}, "${placeName.replace(/'/g, "\\'")}"); return false;'>📚 Bookmark</button>`;
            html += `<button class="action-btn bookmark" onclick='sharePlace(${lat}, ${lng}, "${placeName.replace(/'/g, "\\'")})", "${placeId}"); return false;'>🔖 Share</button>`;
            html += `</div>`;
            html += `</div>`;
            
            // Add marker with click handler
            const marker = new google.maps.Marker({
                position: placeLocation,
                map: map,
                title: placeName,
                label: String(i + 1)
            });
            
            marker.addListener("click", () => {
                showPlaceInfoWindow(place, marker);
            });
            
            markers.push(marker);
        });
        
        resultsDiv.innerHTML = html;
        
        // Fit bounds to show all markers
        if (markers.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            markers.forEach(marker => bounds.extend(marker.getPosition()));
            map.fitBounds(bounds);
        }
    } else {
        resultsDiv.innerHTML = `<strong>No places found. Try a different search term or increase the radius.</strong>`;
    }
}

function showPlaceOnMap(lat, lng, name) {
    const location = { lat: lat, lng: lng };
    map.setCenter(location);
    map.setZoom(16);
    
    infoWindow.setContent(`<strong>${name}</strong><br>📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    infoWindow.setPosition(location);
    infoWindow.open(map);
}

function getDistanceToPlace(lat, lng, name) {
    const destination = { lat: lat, lng: lng };
    const origin = currentUserLocation || map.getCenter();

    const request = {
        origins: [origin],
        destinations: [destination],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC
    };

    distanceMatrixService.getDistanceMatrix(request, (response, status) => {
        if (status === 'OK') {
            const result = response.rows[0].elements[0];
            if (result.status === 'OK') {
                alert(`Distance to ${name}:\n${result.distance.text}\nEstimated time: ${result.duration.text}`);
            }
        } else {
            alert("Could not calculate distance");
        }
    });
}

function showPlaceInfoWindow(place, marker) {
    let content = `<div style="max-width: 250px;">`;
    content += `<strong style="font-size: 16px;">${place.name}</strong><br>`;
    
    if (place.rating) {
        content += `⭐ ${place.rating}<br>`;
    }
    
    if (place.vicinity) {
        content += `📍 ${place.vicinity}<br>`;
    }
    
    content += `<div style="margin-top: 10px;">`;
    content += `<button class="action-btn" style="font-size: 12px;" onclick='getDirectionsToPlace(${place.geometry.location.lat()}, ${place.geometry.location.lng()}, "${place.name.replace(/'/g, "\\'")}"); return false;'>Get Directions</button>`;
    content += `<button class="action-btn info" style="font-size: 12px;" onclick='getPlaceDetails("${place.place_id}"); return false;'>More Info</button>`;
    content += `<button class="action-btn bookmark" style="font-size: 12px;" onclick='sharePlace(${place.geometry.location.lat()}, ${place.geometry.location.lng()}, "${place.name.replace(/'/g, "\\'")}", "${place.place_id}"); return false;'>Share</button>`;
    content += `</div>`;
    content += `</div>`;
    
    infoWindow.setContent(content);
    infoWindow.open(map, marker);
}

function getPlaceDetails(placeId) {
    const request = {
        placeId: placeId,
        fields: ['name', 'formatted_address', 'formatted_phone_number', 
                 'opening_hours', 'rating', 'website', 'url', 'geometry', 'reviews']
    };

    placesService.getDetails(request, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            let content = `<div style="max-width: 350px;">`;
            content += `<h3 style="margin-top: 0;">${place.name}</h3>`;
            
            if (place.formatted_address) {
                content += `<strong>Address:</strong> ${place.formatted_address}<br>`;
            }
            
            if (place.formatted_phone_number) {
                content += `<strong>Phone:</strong> ${place.formatted_phone_number}<br>`;
            }
            
            if (place.rating) {
                content += `<strong>Rating:</strong> ⭐ ${place.rating}/5<br>`;
            }
            
            if (place.website) {
                content += `<strong>Website:</strong> <a href="${place.website}" target="_blank">Visit</a><br>`;
            }
            
            if (place.url) {
                content += `<strong>Google Maps:</strong> <a href="${place.url}" target="_blank">Open</a><br>`;
            }
            
            if (place.opening_hours) {
                content += `<br><strong>Opening Hours:</strong><br>`;
                content += `<div style="font-size: 13px;">`;
                place.opening_hours.weekday_text.forEach(day => {
                    content += `${day}<br>`;
                });
                content += `</div>`;
            }
            
            if (place.reviews && place.reviews.length > 0) {
                content += `<br><strong>Recent Review:</strong><br>`;
                content += `<div style="font-size: 13px; font-style: italic; padding: 8px; background: #f9f9f9; border-radius: 4px;">`;
                content += `"${place.reviews[0].text}"<br>`;
                content += `<span style="color: #666;">- ${place.reviews[0].author_name}</span>`;
                content += `</div>`;
            }
            
            content += `</div>`;
            
            infoWindow.setContent(content);
            infoWindow.setPosition(place.geometry.location);
            infoWindow.open(map);
            map.setCenter(place.geometry.location);
        }
    });
}

// ======================================
// GEOCODING API FUNCTIONS
// ======================================
function forwardGeocode() {
    const address = document.getElementById("geocode-address").value;

    if (!address) {
        alert("Please enter an address");
        return;
    }

    geocoder.geocode({ address: address }, (results, status) => {
        if (status === 'OK') {
            const location = results[0].geometry.location;
            map.setCenter(location);
            map.setZoom(15);
            clearMarkers();
            
            const marker = new google.maps.Marker({
                position: location,
                map: map,
                title: results[0].formatted_address
            });
            markers.push(marker);
            
            let html = `<strong>Geocoding Result:</strong><br>`;
            html += `<strong>Address:</strong> ${results[0].formatted_address}<br>`;
            html += `<strong>Coordinates:</strong> ${location.lat()}, ${location.lng()}<br>`;
            html += `<strong>Place ID:</strong> ${results[0].place_id}<br>`;
            
            document.getElementById("geocode-result").innerHTML = html;
        } else {
            document.getElementById("geocode-result").innerHTML = `Geocoding failed: ${status}`;
        }
    });
}

function reverseGeocode() {
    const lat = parseFloat(document.getElementById("reverse-lat").value);
    const lng = parseFloat(document.getElementById("reverse-lng").value);

    if (isNaN(lat) || isNaN(lng)) {
        alert("Please enter valid coordinates");
        return;
    }

    const latLng = { lat: lat, lng: lng };

    geocoder.geocode({ location: latLng }, (results, status) => {
        if (status === 'OK' && results[0]) {
            clearMarkers();
            const marker = new google.maps.Marker({
                position: latLng,
                map: map,
                title: results[0].formatted_address
            });
            markers.push(marker);
            map.setCenter(latLng);
            
            let html = `<strong>Reverse Geocoding Result:</strong><br>`;
            html += `<strong>Address:</strong> ${results[0].formatted_address}<br>`;
            html += `<strong>Coordinates:</strong> ${lat}, ${lng}<br>`;
            html += `<br><strong>Address Components:</strong><br>`;
            
            results[0].address_components.forEach(component => {
                html += `${component.types[0]}: ${component.long_name}<br>`;
            });
            
            document.getElementById("geocode-result").innerHTML = html;
        } else {
            document.getElementById("geocode-result").innerHTML = `Reverse geocoding failed: ${status}`;
        }
    });
}

// ======================================
// DISTANCE MATRIX API FUNCTIONS
// ======================================
function calculateDistanceMatrix() {
    const origin1 = document.getElementById("matrix-origin-1").value;
    const origin2 = document.getElementById("matrix-origin-2").value;
    const dest1 = document.getElementById("matrix-dest-1").value;
    const dest2 = document.getElementById("matrix-dest-2").value;

    const origins = [origin1, origin2].filter(o => o);
    const destinations = [dest1, dest2].filter(d => d);

    if (origins.length === 0 || destinations.length === 0) {
        alert("Please enter at least one origin and one destination");
        return;
    }

    const request = {
        origins: origins,
        destinations: destinations,
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC
    };

    distanceMatrixService.getDistanceMatrix(request, (response, status) => {
        if (status === 'OK') {
            let html = `<strong>Distance Matrix Results:</strong><br><br>`;
            
            response.rows.forEach((row, i) => {
                html += `<strong>From ${origins[i]}:</strong><br>`;
                row.elements.forEach((element, j) => {
                    if (element.status === 'OK') {
                        html += `  → ${destinations[j]}: ${element.distance.text}, ${element.duration.text}<br>`;
                    } else {
                        html += `  → ${destinations[j]}: ${element.status}<br>`;
                    }
                });
                html += `<br>`;
            });
            
            document.getElementById("matrix-result").innerHTML = html;
        } else {
            document.getElementById("matrix-result").innerHTML = `Distance Matrix failed: ${status}`;
        }
    });
}

// ======================================
// TIMEZONE & WEATHER API FUNCTIONS
// ======================================
async function getLocationInfo() {
    const lat = parseFloat(document.getElementById("location-lat").value);
    const lng = parseFloat(document.getElementById("location-lng").value);

    if (isNaN(lat) || isNaN(lng)) {
        alert("Please enter valid coordinates");
        return;
    }

    const infoDiv = document.getElementById("location-info");
    infoDiv.innerHTML = "Loading...";

    try {
        // Get API key from window (set by Razor page)
        const apiKey = window.GOOGLE_MAPS_API_KEY;
        
        // Time Zone API
        const timestamp = Math.floor(Date.now() / 1000);
        const tzResponse = await fetch(
            `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${timestamp}&key=${apiKey}`
        );
        const tzData = await tzResponse.json();

        // Weather API (Open-Meteo - free)
        const weatherResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&timezone=auto`
        );
        const weatherData = await weatherResponse.json();

        let html = `<strong>Location Information:</strong><br>`;
        html += `<strong>Coordinates:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}<br><br>`;
        
        html += `<strong>🕐 Timezone:</strong><br>`;
        html += `ID: ${tzData.timeZoneId || 'N/A'}<br>`;
        html += `Name: ${tzData.timeZoneName || 'N/A'}<br>`;
        html += `UTC Offset: ${(tzData.rawOffset / 3600).toFixed(1)} hours<br>`;
        html += `DST Offset: ${(tzData.dstOffset / 3600).toFixed(1)} hours<br>`;
        
        if (tzData.timeZoneId) {
            const localTime = new Date().toLocaleString('en-US', { 
                timeZone: tzData.timeZoneId,
                dateStyle: 'full',
                timeStyle: 'long'
            });
            html += `Local Time: ${localTime}<br>`;
        }
        
        html += `<br><strong>🌤️ Current Weather:</strong><br>`;
        html += `Temperature: ${weatherData.current_weather.temperature}°C<br>`;
        html += `Wind Speed: ${weatherData.current_weather.windspeed} km/h<br>`;
        html += `Wind Direction: ${weatherData.current_weather.winddirection}°<br>`;
        
        infoDiv.innerHTML = html;
        
        map.setCenter({ lat, lng });
        clearMarkers();
        const marker = new google.maps.Marker({
            position: { lat, lng },
            map: map,
            title: "Selected Location"
        });
        markers.push(marker);
    } catch (error) {
        infoDiv.innerHTML = `Error: ${error.message}`;
    }
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                document.getElementById("location-lat").value = position.coords.latitude.toFixed(6);
                document.getElementById("location-lng").value = position.coords.longitude.toFixed(6);
                getLocationInfo();
            },
            (error) => {
                alert("Error getting location: " + error.message);
            }
        );
    } else {
        alert("Geolocation is not supported by your browser");
    }
}

// ======================================
// SHARE/BOOKMARK FUNCTIONALITY
// ======================================
function sharePlace(lat, lng, name, placeId) {
    const baseUrl = window.location.origin + window.location.pathname;
    const shareData = {
        lat: lat,
        lng: lng,
        name: name,
        placeId: placeId
    };
    
    // Create shareable URL with encoded data
    const encodedData = btoa(JSON.stringify(shareData));
    const shareUrl = `${baseUrl}?place=${encodedData}`;
    
    // Show modal
    document.getElementById('shareModalTitle').textContent = name;
    document.getElementById('shareLink').value = shareUrl;
    document.getElementById('shareModal').classList.add('active');
    document.getElementById('modalOverlay').classList.add('active');
}

function closeShareModal() {
    document.getElementById('shareModal').classList.remove('active');
    document.getElementById('modalOverlay').classList.remove('active');
    document.getElementById('copyStatus').style.display = 'none';
}

function copyShareLink() {
    const linkInput = document.getElementById('shareLink');
    linkInput.select();
    linkInput.setSelectionRange(0, 99999); // For mobile
    
    navigator.clipboard.writeText(linkInput.value).then(() => {
        const status = document.getElementById('copyStatus');
        status.style.display = 'block';
        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    }).catch(err => {
        alert('Failed to copy link. Please copy manually.');
    });
}

function checkSharedPlace() {
    const urlParams = new URLSearchParams(window.location.search);
    const placeData = urlParams.get('place');
    
    if (placeData) {
        try {
            const decoded = JSON.parse(atob(placeData));
            const { lat, lng, name, placeId } = decoded;
            
            // Show notification
            showSharedPlaceNotification(name);
            
            // Center map on shared place
            const location = { lat: lat, lng: lng };
            map.setCenter(location);
            map.setZoom(16);
            
            // Add marker
            clearMarkers();
            const marker = new google.maps.Marker({
                position: location,
                map: map,
                title: name,
                animation: google.maps.Animation.DROP
            });
            markers.push(marker);
            
            // Get and show place details
            if (placeId) {
                setTimeout(() => {
                    getPlaceDetails(placeId);
                }, 500);
            } else {
                // Show basic info window
                const content = `
                    <div style="max-width: 250px;">
                        <h3 style="margin-top: 0;">${name}</h3>
                        <p>📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
                        <button class="action-btn" onclick='getDirectionsToPlace(${lat}, ${lng}, "${name.replace(/'/g, "\\'")}"); return false;'>Get Directions</button>
                    </div>
                `;
                infoWindow.setContent(content);
                infoWindow.open(map, marker);
            }
            
            // Switch to places tab
            showTab('places');
            document.querySelectorAll('.tab-btn')[1].classList.add('active');
            document.querySelector('.tab-btn').classList.remove('active');
            
        } catch (error) {
            console.error('Error loading shared place:', error);
        }
    }
}

function showSharedPlaceNotification(placeName) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #1a73e8;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-weight: bold;
        animation: slideIn 0.3s ease-out;
    `;
    notification.innerHTML = `🔖 Shared Place: ${placeName}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// ======================================
// UTILITY FUNCTIONS
// ======================================
function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}
// ======================================
// BOOKMARK FUNCTIONALITY
// ======================================
async function loadBookmarks() {
    try {
        const response = await fetch('/api/bookmarks');
        if (response.ok) {
            bookmarkedPlaces = await response.json();
            displayBookmarks();
            showBookmarkMarkers();
        } else {
            console.error('Failed to load bookmarks');
            // Fallback to localStorage
            const saved = localStorage.getItem('mapBookmarks');
            if (saved) {
                bookmarkedPlaces = JSON.parse(saved);
                displayBookmarks();
                showBookmarkMarkers();
            }
        }
    } catch (error) {
        console.error('Error loading bookmarks:', error);
        // Fallback to localStorage
        const saved = localStorage.getItem('mapBookmarks');
        if (saved) {
            bookmarkedPlaces = JSON.parse(saved);
            displayBookmarks();
            showBookmarkMarkers();
        }
    }
}

function saveBookmarksToStorage() {
    // Keep localStorage as backup
    localStorage.setItem('mapBookmarks', JSON.stringify(bookmarkedPlaces));
}

function openBookmarkModal() {
    const center = map.getCenter();
    openBookmarkModalAtLocation(center.lat(), center.lng());
}

function openBookmarkModalAtLocation(lat, lng) {
    tempBookmarkData = { lat, lng };
    
    // Reverse geocode to get address
    const latLng = { lat, lng };
    geocoder.geocode({ location: latLng }, (results, status) => {
        const address = (status === 'OK' && results[0]) 
            ? results[0].formatted_address 
            : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        
        document.getElementById('bookmarkLocation').innerHTML = `
            ��� ${address}<br>
            <span style="font-size: 12px;">Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
        `;
    });
    
    // Clear previous inputs
    document.getElementById('bookmarkName').value = '';
    document.getElementById('bookmarkNotes').value = '';
    
    // Show modal
    document.getElementById('bookmarkModal').classList.add('active');
    document.getElementById('bookmarkModalOverlay').classList.add('active');
    
    // Focus on name input
    setTimeout(() => {
        document.getElementById('bookmarkName').focus();
    }, 100);
}

function addBookmarkFromPlace(lat, lng, placeName) {
    tempBookmarkData = { lat, lng };
    
    // Pre-fill with place name
    document.getElementById('bookmarkName').value = placeName;
    document.getElementById('bookmarkNotes').value = '';
    
    // Get address
    const latLng = { lat, lng };
    geocoder.geocode({ location: latLng }, (results, status) => {
        const address = (status === 'OK' && results[0]) 
            ? results[0].formatted_address 
            : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        
        document.getElementById('bookmarkLocation').innerHTML = `
            ��� ${address}<br>
            <span style="font-size: 12px;">Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
        `;
    });
    
    // Show modal
    document.getElementById('bookmarkModal').classList.add('active');
    document.getElementById('bookmarkModalOverlay').classList.add('active');
    
    // Focus on notes input since name is pre-filled
    setTimeout(() => {
        document.getElementById('bookmarkNotes').focus();
    }, 100);
}

function closeBookmarkModal() {
    document.getElementById('bookmarkModal').classList.remove('active');
    document.getElementById('bookmarkModalOverlay').classList.remove('active');
    tempBookmarkData = null;
}

async function saveBookmark() {
    const name = document.getElementById('bookmarkName').value.trim();
    const notes = document.getElementById('bookmarkNotes').value.trim();
    
    if (!name) {
        alert('Please enter a name for the bookmark');
        return;
    }
    
    if (!tempBookmarkData) {
        alert('Error: No location data');
        return;
    }
    
    try {
        const response = await fetch('/api/bookmarks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                notes: notes || null,
                lat: tempBookmarkData.lat,
                lng: tempBookmarkData.lng
            })
        });
        
        if (response.ok) {
            const bookmark = await response.json();
            bookmarkedPlaces.push(bookmark);
            saveBookmarksToStorage();
            displayBookmarks();
            showBookmarkMarkers();
            closeBookmarkModal();
            
            // Show success notification
            showNotification(`✓ Bookmark "${name}" saved!`, '#34a853');
            
            // Switch to bookmarks tab
            showTab('bookmarks');
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-btn')[2].classList.add('active');
        } else {
            const error = await response.json();
            alert('Failed to save bookmark: ' + (error.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error saving bookmark:', error);
        alert('Failed to save bookmark. Please try again.');
    }
}

function displayBookmarks() {
    const container = document.getElementById('bookmarks-list');
    
    if (bookmarkedPlaces.length === 0) {
        container.innerHTML = '<em style="color: #666;">No bookmarks yet. Right-click anywhere on the map to create one!</em>';
        return;
    }
    
    let html = `<div style="margin-bottom: 10px; color: #666; font-weight: bold;">
                    Total Bookmarks: ${bookmarkedPlaces.length}
                </div>`;
    
    // Sort by most recent first
    const sorted = [...bookmarkedPlaces].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    sorted.forEach((bookmark, index) => {
        const date = new Date(bookmark.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        html += `<div class="bookmark-card">`;
        html += `<div style="display: flex; justify-content: space-between; align-items: start;">`;
        html += `<div style="flex: 1;">`;
        html += `<strong style="font-size: 16px; color: #1a73e8;">��� ${bookmark.name}</strong><br>`;
        html += `<span style="font-size: 12px; color: #999;">�� ${date}</span><br>`;
        
        if (bookmark.notes) {
            html += `<div style="margin-top: 8px; padding: 8px; background: #f9f9f9; border-left: 3px solid #1a73e8; border-radius: 3px;">`;
            html += `<strong style="font-size: 13px;">Notes:</strong><br>`;
            html += `<span style="font-size: 13px; color: #555;">${bookmark.notes}</span>`;
            html += `</div>`;
        }
        
        html += `<div style="margin-top: 5px; font-size: 13px; color: #666;">`;
        html += `��� ${bookmark.lat.toFixed(6)}, ${bookmark.lng.toFixed(6)}`;
        html += `</div>`;
        html += `</div>`;
        html += `</div>`;
        
        html += `<div style="margin-top: 10px;">`;
        html += `<button class="action-btn" onclick='goToBookmark(${bookmark.lat}, ${bookmark.lng}, "${bookmark.name.replace(/'/g, "\\'")}"); return false;'>��� Show</button>`;
        html += `<button class="action-btn secondary" onclick='getDirectionsToPlace(${bookmark.lat}, ${bookmark.lng}, "${bookmark.name.replace(/'/g, "\\'")}"); return false;'>��� Directions</button>`;
        html += `<button class="action-btn" onclick='editBookmark(${bookmark.id}); return false;'>✏️ Edit</button>`;
        html += `<button class="action-btn info" onclick='deleteBookmark(${bookmark.id}); return false;'>���️ Delete</button>`;
        html += `</div>`;
        html += `</div>`;
    });
    
    container.innerHTML = html;
}

function goToBookmark(lat, lng, name) {
    const location = { lat, lng };
    map.setCenter(location);
    map.setZoom(16);
    
    infoWindow.setContent(`
        <div style="max-width: 200px;">
            <strong style="font-size: 15px;">��� ${name}</strong><br>
            <span style="font-size: 13px;">��� ${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
        </div>
    `);
    infoWindow.setPosition(location);
    infoWindow.open(map);
}

function editBookmark(id) {
    const bookmark = bookmarkedPlaces.find(b => b.id === id);
    if (!bookmark) return;
    
    tempBookmarkData = { lat: bookmark.lat, lng: bookmark.lng, id: bookmark.id };
    
    document.getElementById('bookmarkName').value = bookmark.name;
    document.getElementById('bookmarkNotes').value = bookmark.notes || '';
    
    document.getElementById('bookmarkLocation').innerHTML = `
        ��� ${bookmark.lat.toFixed(6)}, ${bookmark.lng.toFixed(6)}<br>
        <span style="font-size: 12px;">Editing existing bookmark</span>
    `;
    
    // Change button text
    const saveBtn = document.querySelector('#bookmarkModal .action-btn');
    const originalOnclick = saveBtn.getAttribute('onclick');
    saveBtn.textContent = '��� Update Bookmark';
    saveBtn.setAttribute('onclick', `updateBookmark(${id}); return false;`);
    
    document.getElementById('bookmarkModal').classList.add('active');
    document.getElementById('bookmarkModalOverlay').classList.add('active');
    
    // Restore button after modal closes
    setTimeout(() => {
        const modal = document.getElementById('bookmarkModal');
        if (!modal.classList.contains('active')) {
            saveBtn.textContent = '��� Save Bookmark';
            saveBtn.setAttribute('onclick', originalOnclick);
        }
    }, 100);
}

async function updateBookmark(id) {
    const name = document.getElementById('bookmarkName').value.trim();
    const notes = document.getElementById('bookmarkNotes').value.trim();
    
    if (!name) {
        alert('Please enter a name for the bookmark');
        return;
    }
    
    try {
        const response = await fetch(`/api/bookmarks/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                notes: notes || null
            })
        });
        
        if (response.ok) {
            const updated = await response.json();
            const index = bookmarkedPlaces.findIndex(b => b.id === id);
            if (index !== -1) {
                bookmarkedPlaces[index] = updated;
            }
            
            saveBookmarksToStorage();
            displayBookmarks();
            showBookmarkMarkers();
            closeBookmarkModal();
            
            showNotification(`✓ Bookmark "${name}" updated!`, '#34a853');
        } else {
            const error = await response.json();
            alert('Failed to update bookmark: ' + (error.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error updating bookmark:', error);
        alert('Failed to update bookmark. Please try again.');
    }
}

async function deleteBookmark(id) {
    const bookmark = bookmarkedPlaces.find(b => b.id === id);
    if (!bookmark) return;
    
    if (confirm(`Are you sure you want to delete the bookmark "${bookmark.name}"?`)) {
        try {
            const response = await fetch(`/api/bookmarks/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                bookmarkedPlaces = bookmarkedPlaces.filter(b => b.id !== id);
                saveBookmarksToStorage();
                displayBookmarks();
                showBookmarkMarkers();
                showNotification(`✓ Bookmark "${bookmark.name}" deleted!`, '#ea4335');
            } else {
                alert('Failed to delete bookmark');
            }
        } catch (error) {
            console.error('Error deleting bookmark:', error);
            alert('Failed to delete bookmark. Please try again.');
        }
    }
}

async function clearAllBookmarks() {
    if (bookmarkedPlaces.length === 0) {
        alert('No bookmarks to clear');
        return;
    }
    
    if (confirm(`Are you sure you want to delete all ${bookmarkedPlaces.length} bookmark(s)? This cannot be undone.`)) {
        try {
            const response = await fetch('/api/bookmarks', {
                method: 'DELETE'
            });
            
            if (response.ok) {
                bookmarkedPlaces = [];
                saveBookmarksToStorage();
                displayBookmarks();
                showBookmarkMarkers();
                showNotification('✓ All bookmarks cleared!', '#ea4335');
            } else {
                alert('Failed to clear bookmarks');
            }
        } catch (error) {
            console.error('Error clearing bookmarks:', error);
            alert('Failed to clear bookmarks. Please try again.');
        }
    }
}

function showBookmarkMarkers() {
    // Clear existing bookmark markers
    bookmarkMarkers.forEach(marker => marker.setMap(null));
    bookmarkMarkers = [];
    
    // Add markers for each bookmark
    bookmarkedPlaces.forEach(bookmark => {
        const marker = new google.maps.Marker({
            position: { lat: bookmark.lat, lng: bookmark.lng },
            map: map,
            title: bookmark.name,
            icon: {
                url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            }
        });
        
        marker.addListener('click', () => {
            let content = `<div style="max-width: 250px;">`;
            content += `<strong style="font-size: 16px;">��� ${bookmark.name}</strong><br>`;
            
            if (bookmark.notes) {
                content += `<div style="margin: 8px 0; padding: 8px; background: #f9f9f9; border-radius: 3px;">`;
                content += `<strong style="font-size: 13px;">Notes:</strong><br>`;
                content += `<span style="font-size: 13px;">${bookmark.notes}</span>`;
                content += `</div>`;
            }
            
            content += `<span style="font-size: 12px; color: #666;">��� ${bookmark.lat.toFixed(6)}, ${bookmark.lng.toFixed(6)}</span><br>`;
            
            const date = new Date(bookmark.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            content += `<span style="font-size: 12px; color: #999;">��� Saved: ${date}</span><br>`;
            
            content += `<div style="margin-top: 10px;">`;
            content += `<button class="action-btn" onclick='getDirectionsToPlace(${bookmark.lat}, ${bookmark.lng}, "${bookmark.name.replace(/'/g, "\\'")}"); return false;' style="font-size: 12px;">Get Directions</button>`;
            content += `<button class="action-btn info" onclick='deleteBookmark(${bookmark.id}); return false;' style="font-size: 12px;">Delete</button>`;
            content += `</div>`;
            content += `</div>`;
            
            infoWindow.setContent(content);
            infoWindow.open(map, marker);
        });
        
        bookmarkMarkers.push(marker);
    });
}

function showNotification(message, color = '#1a73e8') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${color};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-weight: bold;
        animation: slideIn 0.3s ease-out;
    `;
    notification.innerHTML = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
