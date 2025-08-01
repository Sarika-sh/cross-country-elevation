/* global google */
let elevator;

window.initMap = async function () {
  elevator = new google.maps.ElevationService();
   await drawAllRoutes(); 

    // Dummy elevation call for testing:
    const elevation = await elevator.getElevationForLocations({
    locations: [
      {lat: -33, lng: 150},
      {lat: -33.1, lng: 150.1}
    ]
  }); 
  console.log("test elevation", elevation);
  console.log("Google Maps API loaded and initialized");  // Add this line for debugging
};

const defaultIds = ["gcptey", "vdwk2d", "wplcez"];
const queryIds = new URLSearchParams(window.location.search).get("ids");
const courseIds = queryIds ? queryIds.split(",") : defaultIds;

const colorPalette = ["blue", "red", "green", "orange", "purple", "teal", "brown"];
const knownNames = {
  gcptey: "Melbourne",
  vdwk2d: "Bramham",
  wplcez: "Bromont"
};

const routes = courseIds.map((id, index) => ({
  file: `https://api.crosscountryapp.com/courses/${id}/geometries`,
  id: id,
  color: colorPalette[index % colorPalette.length],
  name: knownNames[id] || `Course ${id}`
}));

const svg = document.getElementById("elevation");
const tooltip = document.getElementById("tooltip");
const svgNS = "http://www.w3.org/2000/svg";

const margin = { top: 20, right: 20, bottom: 60, left: 70 };
const svgWidth = svg.viewBox.baseVal.width;
const svgHeight = svg.viewBox.baseVal.height;
const plotWidth = svgWidth - margin.left - margin.right;
const plotHeight = svgHeight - margin.top - margin.bottom;

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in kilometers
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // Distance in kilometers
}

function drawAxes(maxDist, minElev, maxElev) {
  svg.innerHTML = ""; // Clear previous SVG contents

  // X-axis label
  const xLabel = document.createElementNS(svgNS, "text");
  xLabel.setAttribute("x", margin.left + plotWidth / 2);
  xLabel.setAttribute("y", svgHeight - 10);
  xLabel.setAttribute("text-anchor", "middle");
  xLabel.setAttribute("class", "axis-label");
  xLabel.textContent = "Distance (km)";
  svg.appendChild(xLabel);

   // Y-axis label
  const yLabel = document.createElementNS(svgNS, "text");
  yLabel.setAttribute("x", 15);
  yLabel.setAttribute("y", margin.top + plotHeight / 2);
  yLabel.setAttribute("transform", `rotate(-90 15,${margin.top + plotHeight / 2})`);
  yLabel.setAttribute("text-anchor", "middle");
  yLabel.setAttribute("class", "axis-label");
  yLabel.textContent = "Elevation (m)";
  svg.appendChild(yLabel);

    // X-axis ticks and labels
  for (let i = 0; i <= 10; i++) {
    const x = margin.left + (plotWidth / 10) * i;
    const label = (maxDist * i / 10).toFixed(2);
    const tick = document.createElementNS(svgNS, "line");
    tick.setAttribute("x1", x);
    tick.setAttribute("y1", svgHeight - margin.bottom);
    tick.setAttribute("x2", x);
    tick.setAttribute("y2", svgHeight - margin.bottom + 6);
    tick.setAttribute("class", "axis-tick");
    svg.appendChild(tick);
  
    
    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", x);
    text.setAttribute("y", svgHeight - margin.bottom + 22);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("class", "axis-label");
    text.textContent = `${label} km`;
    svg.appendChild(text);
  }

// Y-axis ticks and labels
  for (let j = 0; j <= 5; j++) {
    const y = margin.top + (plotHeight / 5) * j;
    const elev = (maxElev - ((maxElev - minElev) * j / 5)).toFixed(0);

    const tick = document.createElementNS(svgNS, "line");
    tick.setAttribute("x1", margin.left - 6);
    tick.setAttribute("y1", y);
    tick.setAttribute("x2", margin.left);
    tick.setAttribute("y2", y);
    tick.setAttribute("class", "axis-tick");
    svg.appendChild(tick);

    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", margin.left - 10);
    label.setAttribute("y", y + 4);
    label.setAttribute("text-anchor", "end");
    label.setAttribute("class", "axis-label");
    label.textContent = `${elev} m`;
    svg.appendChild(label);
  }
} 

async function getGoogleElevations(locations) {
  return new Promise((resolve, reject) => {
    elevator.getElevationForLocations({ locations }, (results, status) => {
      if (status === "OK") {
        resolve(results);
      } else {
        console.error("Google Elevation API error:", status);
        reject(status);
      }
    });
  });
}


async function fetchRouteData(route) {
  console.log(`Fetching route: ${route.id}`);
  const res = await fetch(route.file);
  const json = await res.json();

 const coords = json.docs.find(
      doc => doc.properties.type === "MAIN_ROUTE"
  ).features.filter(
      feature => feature.geometry.type === "LineString"
  ).flatMap(
      feature => feature.geometry.coordinates);

      // Convert to Google API format
  const locations = coords.map(coord => ({ lat: coord[1], lng: coord[0] }));

  // Fetch elevation from Google
  let googleElevations = [];
  try {
    // If more than 512 points, split into batches
    const batchSize = 512;
    for (let i = 0; i < locations.length; i += batchSize) {
      const batch = locations.slice(i, i + batchSize);
      const batchResults = await getGoogleElevations(batch);
      googleElevations.push(...batchResults);
    }
  } catch (err) {
    console.error("Elevation API error:", err);
  }

  const distances = [];
  const elevations = [];

  let totalDist = 0;

  for (let i = 0; i < coords.length; i++) {
    const coord = coords[i];
    const [lon, lat = 0] = coord;

       const elevation = googleElevations[i]?.elevation ?? 0;

      // Calculate the distance for each coordinate pair
      if (i > 0) {
        const [prevLon, prevLat] = coords[i - 1];
        totalDist += haversineDistance(prevLat, prevLon, lat, lon);
      }
      distances.push(totalDist); 
      elevations.push(elevation);
  
  }

  return { route, coords, distances, elevations, totalDist };
}

  function renderLegend(routeData) {
  const legend = document.getElementById("legend");
  legend.innerHTML = ""; // Clear existing

    routeData.forEach(({ route }) => {
    const legendItem = document.createElement("span");
    legendItem.className = "legend-item";
    legendItem.style.color = route.color;
    legendItem.textContent = route.name || route.id;
    legendItem.dataset.route = route.id;

     // Click to toggle visibility
    legendItem.addEventListener("click", () => {
      const path = document.querySelector(`.route-${route.id}`);
      const visible = path?.style.display !== "none";
      if (path) {
        path.style.display = visible ? "none" : "inline";
        legendItem.classList.toggle("inactive", visible);
      }
    });


    // Double-click to change color
    legendItem.addEventListener("dblclick", () => {
      const newColor = prompt(`Enter new color for ${route.name || route.id}:`, route.color);
      if (newColor) {
        route.color = newColor;
        drawAllRoutes(); // Redraw with new color
      }
    });

   legend.appendChild(legendItem);
  });
}

async function drawAllRoutes () {
   const routeData = await Promise.all(routes.map(fetchRouteData));

  let maxDist = 0;
  let minElev = Math.min(...routeData.flatMap(r => r.elevations));
  minElev = Math.min(minElev, 5); // Set minimum visual floor to 5m
  let maxElev = Math.max(...routeData.flatMap(r => r.elevations));

  routeData.forEach(({ distances }) => {
    maxDist = Math.max(maxDist, distances[distances.length - 1]);
  });

console.log("maxDist:", maxDist);
  console.log("minElev:", minElev, "maxElev:", maxElev);

  drawAxes(maxDist, minElev, maxElev);

  routeData.forEach(({ route, distances, elevations }) => {
    const line = document.createElementNS(svgNS, "polyline");
  // Note: distances and maxDist are in kilometers
  const points = distances.map((d, i) => {
     const x = margin.left + (plotWidth * d / maxDist);
      const y = margin.top + (plotHeight * (maxElev - elevations[i]) / (maxElev - minElev));
      return `${x},${y}`;
    });
  
    line.setAttribute("points", points.join(" "));
    line.setAttribute("stroke", route.color);
    line.setAttribute("fill", "none");
    line.setAttribute("class", `route-line route-${route.id}`); 
    svg.appendChild(line);

    // Add route points as small circles
    distances.forEach((dist, i) => {
      const x = margin.left + (plotWidth * dist / maxDist);
      const y = margin.top + (plotHeight * (maxElev - elevations[i]) / (maxElev - minElev));
      
      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("cx", x);
      circle.setAttribute("cy", y);
      circle.setAttribute("r", 3);
      circle.setAttribute("fill", route.color);
      circle.setAttribute("class", "route-point");

      circle.addEventListener("mouseenter", () => {
        const pt = svg.createSVGPoint();
        pt.x = x;
        pt.y = y;
        const screenPt = pt.matrixTransform(svg.getScreenCTM());
        tooltip.style.top = `${screenPt.y + window.scrollY + 5}px`;
        tooltip.style.left = `${screenPt.x + window.scrollX + 5}px`;
        tooltip.style.display = "block";
        tooltip.innerHTML = `${route.name}<br />${dist.toFixed(2)} km<br />${elevations[i].toFixed(1)} m`;
      });

      circle.addEventListener("mouseleave", () => {
        tooltip.style.display = "none";
      });

      svg.appendChild(circle);
    });
  });
   renderLegend(routeData);
}
