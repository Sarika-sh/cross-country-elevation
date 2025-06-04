const routes = [
  { file: "data/melbourne.json", color: "blue", name: "Melbourne", elev: "data/melbourne_elev.json" },
  { file: "data/bromont.json", color: "red", name: "Bromont", elev: "data/bromont_elev.json" },
  { file: "data/bramham.json", color: "green", name: "Bramham", elev: "data/bramham_elev.json" }
];

// DRAW ROUTE on MAP
function drawRoute({ file, color, name }) {
  fetch(file)
    .then(res => res.json())
    .then(json => {
      const coords = json.docs[0].features[0].geometry.coordinates;

      const xCoords = coords.map(c => c[0]);
      const yCoords = coords.map(c => c[1]);
      const minX = Math.min(...xCoords);
      const maxX = Math.max(...xCoords);
      const minY = Math.min(...yCoords);
      const maxY = Math.max(...yCoords);

      const svgWidth = 800;
      const svgHeight = 400;
      const scaleX = svgWidth / (maxX - minX);
      const scaleY = svgHeight / (maxY - minY);

      const points = coords.map(([lon, lat]) => {
        const x = (lon - minX) * scaleX;
        const y = svgHeight - (lat - minY) * scaleY;
        return [x, y];
      });

      const pathData = points.map((p, i) =>
        i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`
      ).join(" ");

      const svg = document.getElementById("map");

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);
      path.setAttribute("stroke", color);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke-width", "2");
      svg.appendChild(path);

      // Add label
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      const [labelX, labelY] = points[Math.floor(points.length / 2)];
      label.setAttribute("x", labelX + 5);
      label.setAttribute("y", labelY);
      label.setAttribute("fill", color);
      label.setAttribute("font-size", "12");
      label.setAttribute("font-family", "sans-serif");
      label.textContent = name;
      svg.appendChild(label);
    })
    .catch(err => {
      console.error(`Error loading ${name}:`, err);
    });
}

// DRAW ELEVATION PROFILE
async function loadElevation(jsonUrl, color) {
  try {
    const res = await fetch(jsonUrl);
    const json = await res.json();
    const coords = json.docs[0].features[0].geometry.coordinates;

    const distances = [];
    const elevations = [];
    let totalDist = 0;

    for (let i = 0; i < coords.length; i++) {
      const [lon, lat, ele] = coords[i];
      if (i > 0) {
        const [prevLon, prevLat] = coords[i - 1];
        const dx = lon - prevLon;
        const dy = lat - prevLat;
        const dist = Math.sqrt(dx * dx + dy * dy) * 111.32; // Rough km conversion
        totalDist += dist;
      }
      distances.push(totalDist); // km
      elevations.push(ele); // meters
    }

    const svg = document.getElementById("elevation");
    const svgWidth = svg.viewBox.baseVal.width || 800;
    const svgHeight = svg.viewBox.baseVal.height || 200;

    const minDist = Math.min(...distances);
    const maxDist = Math.max(...distances);
    const minElev = Math.min(...elevations);
    const maxElev = Math.max(...elevations);

    const points = distances.map((d, i) => {
      const x = ((d - minDist) / (maxDist - minDist)) * svgWidth;
      const y = svgHeight - ((elevations[i] - minElev) / (maxElev - minElev)) * svgHeight;
      return [x, y];
    });

    const pathData = points.map((p, i) =>
      i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`
    ).join(" ");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    path.setAttribute("stroke", color);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-width", "2");
    svg.appendChild(path);
  } catch (err) {
    console.error("Elevation load failed:", err);
  }
}

// Run all
routes.forEach(route => {
  drawRoute(route);
  loadElevation(route.elev, route.color);
});
