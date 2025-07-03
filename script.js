let googleMapsLoaded = false;
let elevator;

window.initMap = async function () {
  googleMapsLoaded = true;
  elevator = new google.maps.ElevationService();

   const map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: -33.05, lng: 150.05 },
    zoom: 12,
  });
  
  const elevation = await elevator.getElevationForLocations({
    locations: [
      {lat: -33, lng: 150},
      {lat: -33.1, lng: 150.1}
    ]
  }); 
  console.log("elevation from Google", elevation);
  console.log("Google Maps API loaded and initialized");  // Add this line for debugging
}

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
  const elevRange = maxElev - minElev || 1;
  const totalDist = distances[distances.length - 1];
  
  console.log("City min max ele:", minElev, maxElev, elevRange, plotHeight);

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
      tooltip.style.top = `${screenPt.y}px`;
      tooltip.innerHTML = `<strong>${route.id}</strong><br>Distance: ${distances[i].toFixed(2)} km<br>Elevation: ${elevations[i].toFixed(1)} m`;
      tooltip.style.display = "block";
    });
    circle.addEventListener("mouseleave", () => {
      tooltip.style.display = "none";
    });

    svg.appendChild(circle);
  });

  const legend = document.getElementById("legend");
  const legendItem = document.createElement("span");
  legendItem.className = "legend-item";
  legendItem.style.color = route.color;
  legendItem.textContent = route.name || route.id;
  legendItem.dataset.route = route.id;

  // Toggle visibility on click
  legendItem.addEventListener("click", () => {
    const path = document.querySelector(`.route-${route.id}`);
    const visible = path.style.display !== "none";
    path.style.display = visible ? "none" : "inline";
    legendItem.classList.toggle("inactive", visible);
  });

  // Change color on double-click
  legendItem.addEventListener("dblclick", () => {
    const newColor = prompt(`Enter new color for ${route.id}`, route.color);
    if (newColor) {
      // Update line color
      const path = document.querySelector(`.route-${route.id}`);
      path.setAttribute("stroke", newColor);

      // Update all matching circles
      document.querySelectorAll(`.route-${route.id} ~ circle`).forEach(c => {
        c.setAttribute("fill", newColor);
      });

      // Update legend color
      legendItem.style.color = newColor;
    }
  });

  legend.appendChild(legendItem);
}

async function drawAllRoutes() {
  svg.innerHTML = "";
  document.getElementById("legend").innerHTML = "";
  const elevsArrays = [];
  const distsArrays = [];

  // First load all data
  const courseData = [];
  for (const route of routes) {
    const res = await fetch(route.file);
    const json = await res.json();

    const distances = [];
    const elevations = [];
    let totalDist = 0;

    for (const feature of json.docs[0].features) {
      const coords = feature.geometry.coordinates;

      for (let i = 0; i < coords.length; i++) {
        const coord = coords[i];
        if (!Array.isArray(coord) || coord.length < 2) continue;

        const [lon, lat, ele = 0] = coord;
        let elevation = route.id === "gcptey" ? 0 : ele; // If the route is gcptey, set the elevation to 0

        if (i > 0) {
          const [prevLon, prevLat] = coords[i - 1];
          if (prevLat && prevLon && lat && lon) {
            totalDist += haversineDistance(prevLat, prevLon, lat, lon);
          }
        }

        distances.push(totalDist);
        elevations.push(elevation);
      }
    }

    elevsArrays.push(elevations);
    distsArrays.push(distances);
    courseData.push({ route, elevations, distances });
  }

  // Compute global min/max
  const allDists = distsArrays.flat(); // [[1, 2], [4, 5]] -> [1, 2, 4, 5]
  const allElevs = elevsArrays.flat();
  const maxDist = Math.max(...allDists);
  const minElev = Math.min(...allElevs);
  const maxElev = Math.max(...allElevs);

  // Draw axes once
  drawAxes(maxDist, minElev, maxElev);

  // Plot each course using shared scale
  for (const { route, elevations, distances } of courseData) {
    drawCourse(route, elevations, distances, minElev, maxElev, maxDist);
  }
}

function drawAxes(maxDist, minElev, maxElev) {
  // X-axis label
  const xLabel = document.createElementNS(svgNS, "text");
  xLabel.setAttribute("x", margin.left + plotWidth / 2);
  xLabel.setAttribute("y", svgHeight - 10);
  xLabel.setAttribute("text-anchor", "middle");
  xLabel.setAttribute("class", "axis-label");
  xLabel.textContent = "Distance (km)";  // X-axis label
  svg.appendChild(xLabel);

  // Y-axis label
  const yLabel = document.createElementNS(svgNS, "text");
  yLabel.setAttribute("x", 15);
  yLabel.setAttribute("y", margin.top + plotHeight / 2);
  yLabel.setAttribute("transform", `rotate(-90 15,${margin.top + plotHeight / 2})`);
  yLabel.setAttribute("text-anchor", "middle");
  yLabel.setAttribute("class", "axis-label");
  yLabel.textContent = "Elevation (m)";  // Y-axis label
  svg.appendChild(yLabel);

  // X-axis ticks and labels
  for (let i = 0; i <= 10; i++) {
    const x = margin.left + (plotWidth / 10) * i;
    const label = (maxDist * i / 10).toFixed(2); // Show more decimal places
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
    text.textContent = `${label} km`;  // X-axis labels
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
    label.textContent = `${elev} m`;  // Y-axis labels
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
    
      const [lon, lat, ele = 0] = coord;

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
    const item = document.createElement("div");
    item.classList.add("legend-item");
    item.style.marginRight = "20px";
    item.style.cursor = "pointer";

    const colorBox = document.createElement("span");
    colorBox.style.display = "inline-block";
    colorBox.style.width = "12px";
    colorBox.style.height = "12px";
    colorBox.style.backgroundColor = route.color;
    colorBox.style.marginRight = "6px";
    colorBox.style.border = "1px solid #000";

    const label = document.createElement("span");
    label.textContent = route.name || route.id;

    item.appendChild(colorBox);
    item.appendChild(label);
    legend.appendChild(item);

    // Add double-click to change color
    item.addEventListener("dblclick", async () => {
      const newColor = prompt(`Enter a new color for ${route.name || route.id}:`, route.color);
      if (newColor) {
        route.color = newColor;

        // Redraw everything with new color
        drawAllRoutes();      
          }
    });
  });
}

async function drawAllRoutes() {
   const routeData = await Promise.all(routes.map(fetchRouteData));

  let maxDist = 0;
  let minElev = Math.min(...routeData.flatMap(r => r.elevations));
  minElev = Math.min(minElev, 5); // Set minimum visual floor to 5m
  let maxElev = Math.max(...routeData.flatMap(r => r.elevations));

  routeData.forEach(({ distances, elevations }) => {
    maxDist = Math.max(maxDist, distances[distances.length - 1]);
  });

console.log("maxDist:", maxDist);
  console.log("minElev:", minElev, "maxElev:", maxElev);

  drawAxes(maxDist, minElev, maxElev);

  routeData.forEach(({ route, distances, elevations }) => {
    const line = document.createElementNS(svgNS, "polyline");
  // Note: distances and maxDist are in kilometers
  const points = distances.map((d, i) => {
    return `${margin.left + (plotWidth * d / maxDist)},${margin.top + (plotHeight * (maxElev - elevations[i]) / (maxElev - minElev))}`;
  });

    line.setAttribute("points", points.join(" "));
    line.setAttribute("stroke", route.color);
    line.setAttribute("fill", "none");
    line.setAttribute("class", "route-line");
    svg.appendChild(line);

    // Add route points as small circles
    distances.forEach((dist, i) => {
      const p = [margin.left + (plotWidth * dist / maxDist), margin.top + (plotHeight * (maxElev - elevations[i]) / (maxElev - minElev))];
      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("cx", p[0]);
      circle.setAttribute("cy", p[1]);
      circle.setAttribute("r", 3);
      circle.setAttribute("fill", route.color);
      circle.setAttribute("class", "route-point");

      circle.addEventListener("mouseenter", () => {
        const pt = svg.createSVGPoint();
        pt.x = p[0];
        pt.y = p[1];
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

document.addEventListener("DOMContentLoaded", drawAllRoutes);
