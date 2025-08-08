# 📈 Cross Country Elevation Profiles
Visualize elevation profiles for cross-country routes for Melbourne, Bromont & Bramham using the Google Maps Elevation API.
This tool fetches route data, samples coordinates efficiently, and plots elevation vs. distance in a clean, interactive SVG chart.

# ![preview](https://github.com/user-attachments/assets/2ad80862-6a95-4b52-bf79-22053adc7306)

# 🌍 Project Purpose
This project is designed to:

Load cross-country course geometries from an external API

Sample route points (max 512) for optimal performance

Call Google’s Elevation API only once per route

Render a clear elevation profile using SVG in the browser

# ⚙️ Features
🗺️ Supports multiple route files (Melbourne, Bramham, Bromont.)

📏 Smart coordinate sampling to stay within API limits

📊 SVG-based elevation chart with interactive tooltips

🧭 Toggle route visibility & change colors via legend

🐞 Debug logging (e.g., number of sampled points)

# 🛠 Tech Stack
JavaScript (ES6+)

Google Maps Elevation API

SVG for chart rendering

HTML/CSS

# 🔗 Live Demo - https://sarika-sh.github.io/cross-country-elevation/




