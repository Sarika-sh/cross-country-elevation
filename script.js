const Routes = [
  { file: "https://api.crosscountryapp.com/courses/gcptey/geometries", id: "gcptey", color: "blue", name: "Melbourne" },
  { file: "https://api.crosscountryapp.com/courses/wplcez/geometries", id: "wplcez", color: "red", name: "Bromont" },
  { file: "https://api.crosscountryapp.com/courses/vdwk2d/geometries", id: "vdwk2d", color: "green", name: "Bramham" }
];
const defaultRoutes = [
  { id: "gcptey", color: "blue", name: "Melbourne" },
  { id: "wplcez", color: "red", name: "Bromont" },
  { id: "vdwk2d", color: "green", name: "Bramham" }
];

function getRoutesFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const ids = params.get("ids");
  if (!ids) return defaultRoutes.map(({ id, color, name }) => ({
    id,
    name,
    color,
    file: `https://api.crosscountryapp.com/courses/${id}/geometries`
  }));
  return ids.split(",").map((id, i) => {
    const match = defaultRoutes.find(r => r.id === id);
    return {
      id,
      name: match?.name || `Course ${id}`,
      color: match?.color || ["blue", "red", "green", "purple", "orange"][i % 5],
      file: `https://api.crosscountryapp.com/courses/${id}/geometries`
    };
  });
}

const routes = getRoutesFromQuery();
const svg = document.getElementById("elevation");
const tooltip = document.getElementById("tooltip");
const svgNS = "http://www.w3.org/2000/svg";

const margin = { top: 20, right: 20, bottom: 60, left: 70 };
const svgWidth = svg.viewBox.baseVal.width;
const svgHeight = svg.viewBox.baseVal.height;
const plotWidth = svgWidth - margin.left - margin.right;
const plotHeight = svgHeight - margin.top - margin.bottom;

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function drawAxes(maxDist, minElev, maxElev) {
  const elevRange = maxElev - minElev || 1;
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
    const elev = (maxElev - (elevRange * j / 5)).toFixed(0);
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
}

async function fetchRouteData(route) {
  const res = await fetch(route.file);
  const json = await res.json();
  const coords = json.docs.flatMap(doc => doc.features.flatMap(f => f.geometry.coordinates));

  const distances = [];
  const elevations = [];

  let totalDist = 0;

  for (let i = 0; i < coords.length; i++) {
    const coord = coords[i];

    // Check if coord is an array and contains at least 3 elements (lon, lat, elevation)
    if (Array.isArray(coord) && coord.length >= 3) {
      const [lon, lat, ele = 0] = coord;

      // For Melbourne, explicitly set elevation to 0
      const elevation = route.name === "Melbourne" ? 0 : ele;

      // Calculate the distance for each coordinate pair
      if (i > 0) {
        const [prevLon, prevLat] = coords[i - 1];
        totalDist += haversineDistance(prevLat, prevLon, lat, lon);
      }

      distances.push(totalDist);
      elevations.push(elevation);
    } else {
      // Log malformed coordinate entry
      console.warn(`Malformed coordinate entry at index ${i}:`, coord);
    }
  }

  return { route, coords, distances, elevations, totalDist };
}

async function drawAllRoutes() {
  const routeData = await Promise.all(routes.map(fetchRouteData));

  let maxDist = 0;
  let minElev = Math.min(...routeData.flatMap(r => r.elevations));
  let maxElev = Math.max(...routeData.flatMap(r => r.elevations));

  routeData.forEach(({ distances, elevations }) => {
    maxDist = Math.max(maxDist, distances[distances.length - 1]);
  });

  drawAxes(maxDist, minElev, maxElev);

  routeData.forEach(({ route, distances, elevations }) => {
    const line = document.createElementNS(svgNS, "polyline");
    const points = distances.map((d, i) => `${margin.left + (plotWidth * d / maxDist)},${margin.top + (plotHeight * (maxElev - elevations[i]) / (maxElev - minElev))}`);
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
        tooltip.innerHTML = `${route.name}<br />${(distances[i] / 1000).toFixed(2)} km<br />${elevations[i]} m`;
      });

      circle.addEventListener("mouseleave", () => {
        tooltip.style.display = "none";
      });

      svg.appendChild(circle);
    });
  });
}

document.addEventListener("DOMContentLoaded", drawAllRoutes);
