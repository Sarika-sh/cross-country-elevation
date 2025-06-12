const routes = [
  { file: "https://api.crosscountryapp.com/courses/gcptey/geometries", id: "gcptey", color: "blue", name: "Melbourne" },
       { file: "https://api.crosscountryapp.com/courses/vdwk2d/geometries", id: "vdwk2d", color: "green", name: "Bramham" },
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
  const R = 6371; // Radius of Earth in kilometers
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // Distance in kilometers
}

function drawAxes(maxDist, minElev, maxElev) {
  const xLabel = document.createElementNS(svgNS, "text");
  xLabel.setAttribute("x", margin.left + plotWidth / 2);
  xLabel.setAttribute("y", svgHeight - 20);
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

async function loadElevation(route) {
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
      let elevation = ele;

      // If the route is Melbourne, set the elevation to 0
      if (route.name === "Melbourne") {
        elevation = 0;
      }

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

  const minElev = 0;
  const maxElev = Math.max(...elevations);
  const elevRange = maxElev - minElev || 1;

  console.log("City min max ele:", minElev, maxElev, elevRange);

  
  const points = distances.map((d, i) => {
    const x = margin.left + (d / totalDist) * plotWidth;
    const y = margin.top + plotHeight * (1 - (elevations[i] - minElev) / elevRange);
        return [x, y];
  });
  
  const pathData = points.map((p, i) => i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`).join(" ");
  const path = document.createElementNS(svgNS, "path");
  path.setAttribute("d", pathData);
  path.setAttribute("stroke", route.color);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("class", `route-line route-${route.name}`);
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
      tooltip.innerHTML = `<strong>${route.name}</strong><br>Distance: ${distances[i].toFixed(2)} km<br>Elevation: ${elevations[i].toFixed(1)} m`;
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
  drawAxes(Math.max(...allDists), Math.min(...allElevs), Math.max(...allElevs));
}

drawAllRoutes();
