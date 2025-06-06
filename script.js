const routes = [
  { file: "https://api.crosscountryapp.com/courses/gcptey/geometries", color: "blue", name: "Melbourne" },
  { file: "https://api.crosscountryapp.com/courses/wplcez/geometries", color: "red", name: "Bromont" },
  { file: "https://api.crosscountryapp.com/courses/vdwk2d/geometries", color: "green", name: "Bramham" }
];

const svg = document.getElementById("elevation");
const tooltip = document.getElementById("tooltip");
const svgNS = "http://www.w3.org/2000/svg";

const margin = { top: 20, right: 20, bottom: 60, left: 70 };
const svgWidth = svg.viewBox.baseVal.width;
const svgHeight = svg.viewBox.baseVal.height;
const plotWidth = svgWidth - margin.left - margin.right;
const plotHeight = svgHeight - margin.top - margin.bottom;

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function drawAxes(maxDist, minElev, maxElev) {
  // X axis
  const xAxisLabel = document.createElementNS(svgNS, "text");
  xAxisLabel.setAttribute("x", margin.left + plotWidth / 2);
  xAxisLabel.setAttribute("y", svgHeight - 20);
  xAxisLabel.setAttribute("text-anchor", "middle");
  xAxisLabel.setAttribute("class", "axis-label");
  xAxisLabel.textContent = "Distance (km)";
  svg.appendChild(xAxisLabel);

  // Y axis
  const yAxisLabel = document.createElementNS(svgNS, "text");
  yAxisLabel.setAttribute("x", 15);
  yAxisLabel.setAttribute("y", margin.top + plotHeight / 2);
  yAxisLabel.setAttribute("transform", `rotate(-90 15,${margin.top + plotHeight / 2})`);
  yAxisLabel.setAttribute("text-anchor", "middle");
  yAxisLabel.setAttribute("class", "axis-label");
  yAxisLabel.textContent = "Elevation (m)";
  svg.appendChild(yAxisLabel);

  // X ticks
  for (let i = 0; i <= 10; i++) {
    const x = margin.left + (plotWidth / 10) * i;
    const distLabel = (maxDist * i / 10).toFixed(1);

    const tick = document.createElementNS(svgNS, "line");
    tick.setAttribute("x1", x);
    tick.setAttribute("y1", svgHeight - margin.bottom);
    tick.setAttribute("x2", x);
    tick.setAttribute("y2", svgHeight - margin.bottom + 6);
    tick.setAttribute("class", "axis-tick");
    svg.appendChild(tick);

    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", x);
    label.setAttribute("y", svgHeight - margin.bottom + 22);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("class", "axis-label");
    label.textContent = `${distLabel} km`;
    svg.appendChild(label);
  }

  // Y ticks
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

async function loadElevation(route) {
  const res = await fetch(route.file);
  const json = await res.json();
  const coords = json.docs[0].features[0].geometry.coordinates;

  const distances = [];
  const elevations = [];
  let totalDist = 0;

  for (let i = 0; i < coords.length; i++) {
    const [lon, lat, ele] = coords[i];
    let elevation = typeof ele === "number" ? ele : 0;
    if (route.name !== "Melbourne") elevation += Math.random() * 5;
    if (i > 0) {
      const [prevLon, prevLat] = coords[i - 1];
      totalDist += haversineDistance(prevLat, prevLon, lat, lon);
    }
    distances.push(totalDist);
    elevations.push(elevation);
  }

  const minElev = Math.min(...elevations);
  const maxElev = Math.max(...elevations);
  const elevRange = maxElev - minElev || 1;

  const points = distances.map((d, i) => {
    const x = margin.left + (d / totalDist) * plotWidth;
    const elev = elevations[i];
    const y = margin.top + plotHeight * (1 - (elev - minElev) / elevRange);
    return [x, y];
  });

  const pathData = points.map((p, i) => i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`).join(" ");
  // Smoothed path using quadratic Bézier approximation (optional: keep original for sharper edges)
const path = document.createElementNS(svgNS, "path");
path.setAttribute("d", pathData);
path.setAttribute("stroke", route.color);
path.setAttribute("fill", "none");
path.setAttribute("stroke-width", "2");
path.setAttribute("class", `route-line route-${route.name}`);
svg.appendChild(path);

// Add shaded area under the path
const shadedPath = document.createElementNS(svgNS, "path");
const shadedData = pathData + ` L ${points[points.length - 1][0]} ${svgHeight - margin.bottom} L ${points[0][0]} ${svgHeight - margin.bottom} Z`;
shadedPath.setAttribute("d", shadedData);
shadedPath.setAttribute("fill", route.color);
shadedPath.setAttribute("opacity", 0.1);
shadedPath.setAttribute("class", `route-shade route-${route.name}`);
svg.insertBefore(shadedPath, path); // draw underneath the line


  // Tooltip circles
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
      tooltip.innerHTML = `<strong>${route.name}</strong><br>Distance: ${distances[i].toFixed(2)} km<br>Elevation: ${elevations[i].toFixed(1)} m`;
      tooltip.style.display = "block";
    });
    circle.addEventListener("mouseleave", () => (tooltip.style.display = "none"));

    svg.appendChild(circle);
  });

  // Legend
  const legend = document.getElementById("legend");
  const legendItem = document.createElement("span");
  legendItem.className = "legend-item";
  legendItem.style.color = route.color;
  legendItem.textContent = route.name;
  legendItem.dataset.route = route.name;
  legendItem.addEventListener("click", () => {
    const path = document.querySelector(`.route-${route.name}`);
    const visible = path.style.display !== "none";
    path.style.display = visible ? "none" : "inline";
    legendItem.classList.toggle("inactive", visible);
  });
  legend.appendChild(legendItem);

  return { elevations, distances };
}

async function drawAllRoutes() {
  const allElevs = [];
  const allDists = [];
  for (const route of routes) {
    const { elevations, distances } = await loadElevation(route);
    allElevs.push(...elevations);
    allDists.push(...distances);
  }
  const minElev = Math.min(...allElevs);
  const maxElev = Math.max(...allElevs);
  const maxDist = Math.max(...allDists);
  drawAxes(maxDist, minElev, maxElev);
}

drawAllRoutes();
