const defaultRoutes = [
  { file: "https://api.crosscountryapp.com/courses/gcptey/geometries", id: "gcptey", color: "blue", name: "Melbourne" },
  { file: "https://api.crosscountryapp.com/courses/wplcez/geometries", id: "wplcez", color: "red", name: "Bromont" },
  { file: "https://api.crosscountryapp.com/courses/vdwk2d/geometries", id: "vdwk2d", color: "green", name: "Bramham" }
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
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
    if (Array.isArray(coord) && coord.length >= 3) {
      const [lon, lat, ele = 0] = coord;
      const elevation = route.name === "Melbourne" ? 0 : ele;

      if (i > 0) {
        const [prevLon, prevLat] = coords[i - 1];
        totalDist += haversineDistance(prevLat, prevLon, lat, lon);
      }

      distances.push(totalDist);
      elevations.push(elevation);
    } else {
      console.warn(`Malformed coordinate entry at index ${i}:`, coord);
    }
  }

  return { route, coords, distances, elevations, totalDist };
}

async function drawAllRoutes() {
  const allData = await Promise.all(routes.map(fetchRouteData));

  const allElevs = allData.flatMap(r => r.elevations);
  const minElev = Math.min(...allElevs);
  const maxElev = Math.max(...allElevs);
  const maxDist = Math.max(...allData.map(r => r.totalDist));

  drawAxes(maxDist, minElev, maxElev);

  for (const { route, distances, elevations, totalDist } of allData) {
    const elevRange = maxElev - minElev || 1;
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
    shaded.setAttribute("d", `${pathData} L ${points.at(-1)[0]} ${svgHeight - margin.bottom} L ${points[0][0]} ${svgHeight - margin.bottom} Z`);
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
      circle.addEventListener("mouseenter", () => {
        const ptDist = distances[i].toFixed(2);
        const ptElev = elevations[i].toFixed(1);
        tooltip.textContent = `${route.name}: ${ptDist} km - ${ptElev} m`;
        tooltip.style.display = "block";
        tooltip.style.left = `${event.pageX + 5}px`;
        tooltip.style.top = `${event.pageY + 5}px`;
      });
      circle.addEventListener("mouseleave", () => {
        tooltip.style.display = "none";
      });
      svg.appendChild(circle);
    });
  }
}

function drawAxes(maxDist, minElev, maxElev) {
  const xScale = d3.scaleLinear().domain([0, maxDist]).range([margin.left, margin.left + plotWidth]);
  const yScale = d3.scaleLinear().domain([maxElev, minElev]).range([margin.top, margin.top + plotHeight]);

  const xAxis = d3.axisBottom(xScale).ticks(5);
  const yAxis = d3.axisLeft(yScale).ticks(5);

  const xAxisGroup = svg.appendChild(document.createElementNS(svgNS, "g"));
  xAxisGroup.setAttribute("transform", `translate(0, ${svgHeight - margin.bottom})`);
  d3.select(xAxisGroup).call(xAxis);

  const yAxisGroup = svg.appendChild(document.createElementNS(svgNS, "g"));
  d3.select(yAxisGroup).call(yAxis);
}

drawAllRoutes();
