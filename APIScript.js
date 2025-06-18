// script.js
let googleMapsLoaded = false;
let elevator;

window.initMap = function () {
  googleMapsLoaded = true;
  elevator = new google.maps.ElevationService();

  // Start drawing elevation after Google Maps JS API is ready
  drawElevationData();
}

const svg = document.getElementById("elevation-chart");
const tooltip = document.getElementById("tooltip");
const svgNS = "http://www.w3.org/2000/svg";

const margin = { top: 20, right: 20, bottom: 60, left: 70 };
const svgWidth = 800;
const svgHeight = 300;
const plotWidth = svgWidth - margin.left - margin.right;
const plotHeight = svgHeight - margin.top - margin.bottom;

const defaultIds = ["gcptey", "vdwk2d", "wplcez"];
const queryIds = new URLSearchParams(window.location.search).get("ids");
const courseIds = queryIds ? queryIds.split(",") : defaultIds;

const colorPalette = ["blue", "red", "green", "orange", "purple", "teal", "brown"];
const routes = courseIds.map((id, index) => ({
  file: `https://api.crosscountryapp.com/courses/${id}/geometries`,
  id: id,
  color: colorPalette[index % colorPalette.length],
}));

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// NEW: Use ElevationService instead of fetch
function getElevation(lat, lng) {
  return new Promise((resolve, reject) => {
    if (!googleMapsLoaded || !elevator) {
      reject(new Error("Google Maps ElevationService not initialized"));
      return;
    }
    elevator.getElevationForLocations({ locations: [{ lat, lng }] }, (results, status) => {
      if (status === google.maps.ElevationStatus.OK && results[0]) {
        resolve(results[0].elevation);
      } else {
        console.warn(`ElevationService error for (${lat},${lng}):`, status);
        resolve(null); // return null on failure to keep data aligned
      }
    });
  });
}

function drawAxes(maxDist, minElev, maxElev) {
  // Clear existing axes if any
  [...svg.querySelectorAll(".axis-label, .axis-tick")].forEach(el => el.remove());

  const xLabel = document.createElementNS(svgNS, "text");
  xLabel.setAttribute("x", margin.left + plotWidth / 2);
  xLabel.setAttribute("y", svgHeight - 10);
  xLabel.setAttribute("text-anchor", "middle");
  xLabel.setAttribute("class", "axis-label");
  xLabel.textContent = "Distance (km)";
  svg.appendChild(xLabel);

  const yLabel = document.createElementNS(svgNS, "text");
  yLabel.setAttribute("x", 15);
  yLabel.setAttribute("y", margin.top + plotHeight / 2);
  yLabel.setAttribute("transform", `rotate(-90 15,${margin.top + plotHeight / 2})`);
  yLabel.setAttribute("text-anchor", "middle");
  yLabel.setAttribute("class", "axis-label");
  yLabel.textContent = "Elevation (m)";
  svg.appendChild(yLabel);

  for (let i = 0; i <= 10; i++) {
    const x = margin.left + (plotWidth / 10) * i;
    const label = (maxDist * i / 10).toFixed(1);

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

async function drawCourse(route, elevations, distances, minElev, maxElev, maxDist) {
  const elevRange = maxElev - minElev || 1;

  const points = distances.map((d, i) => {
    const x = margin.left + (d / maxDist) * plotWidth;
    const y = margin.top + plotHeight * (1 - (elevations[i] - minElev) / elevRange);
    return [x, y];
  });

  const pathData = points.map((p, i) => i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`).join(" ");
  const path = document.createElementNS(svgNS, "path");
  path.setAttribute("d", pathData);
  path.setAttribute("stroke", route.color);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("class", `route-line route-${route.id}`);
  svg.appendChild(path);

  const shaded = document.createElementNS(svgNS, "path");
  shaded.setAttribute("d", pathData + ` L ${points[points.length - 1][0]} ${svgHeight - margin.bottom} L ${points[0][0]} ${svgHeight - margin.bottom} Z`);
  shaded.setAttribute("fill", route.color);
  shaded.setAttribute("opacity", 0.1);
  svg.insertBefore(shaded, path);

  points.forEach((p, i) => {
    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", p[0]);
    circle.setAttribute("cy", p[1]);
    circle.setAttribute("r", 5);
    circle.setAttribute("fill", route.color);
    circle.setAttribute("opacity", 0);
    circle.style.cursor = "pointer";

    circle.addEventListener("mouseenter", () => {
      const pt = svg.createSVGPoint();
      pt.x = p[0];
      pt.y = p[1];
      const screenPt = pt.matrixTransform(svg.getScreenCTM());

      tooltip.style.left = `${screenPt.x + 10}px`;
      tooltip.style.top = `${screenPt.y + 10}px`;
      tooltip.style.display = "block";
      tooltip.textContent = `${route.id} - Dist: ${distances[i].toFixed(2)} km, Elev: ${elevations[i].toFixed(2)} m`;
    });

    circle.addEventListener("mouseleave", () => {
      tooltip.style.display = "none";
    });

    svg.appendChild(circle);
  });
}

function createLegend(routes) {
  const legend = document.getElementById("legend");
  legend.innerHTML = "";
  routes.forEach(route => {
    const item = document.createElement("span");
    item.textContent = route.id;
    item.className = "legend-item";
    item.style.color = route.color;
    item.style.fontWeight = "bold";
    item.dataset.id = route.id;

    item.addEventListener("click", () => {
      const lines = svg.querySelectorAll(`.route-line.route-${route.id}`);
      lines.forEach(line => {
        if (line.style.display !== "none") {
          line.style.display = "none";
          item.classList.add("inactive");
        } else {
          line.style.display = "";
          item.classList.remove("inactive");
        }
      });
    });

    legend.appendChild(item);
  });
}

async function drawElevationData() {
  if (!googleMapsLoaded) {
    // Wait and retry
    setTimeout(drawElevationData, 100);
    return;
  }

  svg.innerHTML = ""; // Clear previous drawing

  createLegend(routes);

  // Fetch route geometry data
  const routePromises = routes.map(route =>
    fetch(route.file)
      .then(res => res.json())
      .catch(err => {
        console.error(`Error fetching route ${route.id}:`, err);
        return null;
      })
  );

  const routeDatas = await Promise.all(routePromises);

  // Process all routes to get elevations and distances
  const elevationResults = [];

  for (let idx = 0; idx < routes.length; idx++) {
    const route = routes[idx];
    const data = routeDatas[idx];
    if (!data || !data.docs || data.docs.length === 0) {
      console.warn(`No geometry data for route ${route.id}`);
      continue;
    }

    const featureCollection = data.docs[0];
    if (!featureCollection.features || featureCollection.features.length === 0) {
      console.warn(`No features for route ${route.id}`);
      continue;
    }

    // Extract coordinates from features (assuming GeoJSON LineString)
    const coords = featureCollection.features[0].geometry.coordinates;

    // Calculate distances (km) along the path
    const distances = [];
    let totalDist = 0;
    for (let i = 0; i < coords.length; i++) {
      if (i === 0) {
        distances.push(0);
      } else {
        const [lon1, lat1] = coords[i - 1];
        const [lon2, lat2] = coords[i];
        totalDist += haversineDistance(lat1, lon1, lat2, lon2);
        distances.push(totalDist);
      }
    }

    // Get elevations using ElevationService, one by one (slow but reliable)
    const elevations = [];
    for (const [lon, lat] of coords) {
      const elev = await getElevation(lat, lon);
      elevations.push(elev === null ? 0 : elev);
    }

    elevationResults.push({ route, distances, elevations });
  }

  // Find global max/min for axes scaling
  const allDistances = elevationResults.flatMap(r => r.distances);
  const allElevations = elevationResults.flatMap(r => r.elevations);

  const maxDist = Math.max(...allDistances);
  const minElev = Math.min(...allElevations);
  const maxElev = Math.max(...allElevations);

  drawAxes(maxDist, minElev, maxElev);

  elevationResults.forEach(({ route, distances, elevations }) => {
    drawCourse(route, elevations, distances, minElev, maxElev, maxDist);
  });
}
