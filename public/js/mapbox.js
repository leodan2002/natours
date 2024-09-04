// const locations = JSON.parse(document.getElementById('map').dataset.locations);

// console.log(locations);

// mapboxgl.accessToken = 'pk.eyJ1IjoibGVvZGFuMjAwMiIsImEiOiJjbTA3OWl0NW4waThyMmxvcW41anN6MWM0In0.R7nDFi7ObhPKVbJm-tGx2A';

// var map = new mapboxgl.Map({
//     container: 'map',
//     style: 'mapbox://styles/leodan2002/cm07a60z4012r01qqh7wme6xx',
//     scrollZoom: false
// });

// const bounds = new mapboxgl.LngLatBounds();

// locations.forEach(loc => {
//     // Create marker
//     const el = document.createElement('div');
//     el.className = 'marker';

//     // Add marker
//     new mapboxgl.Marker({
//         element: el,
//         anchor: 'bottom'
//     }).setLngLat(loc.coordinates).addTo(map);

//     // Add popup
//     new mapboxgl.Popup({
//         offset:30
//     }).setLngLat(loc.coordinates).setHTML(`<p>Day ${loc.day}: ${loc.description}<p>`).addTo(map);

//     // Extend map bounds to include current location
//     bounds.extend(loc.coordinates);
// });

// map.fitBounds(bounds, {
//     padding: {
//         top: 200,
//         bottm: 150,
//         left: 100,
//         right: 100    
//     }
// });

