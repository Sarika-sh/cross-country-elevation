# Cross Country Elevation Profiles

Visualize elevation profiles for cross-country routes using the Google Maps Elevation API. This tool fetches route data, samples coordinates, and plots elevation vs. distance in an interactive SVG chart.

![Elevation Chart Screenshot])
![preview](https://github.com/user-attachments/assets/2ad80862-6a95-4b52-bf79-22053adc7306)

## 🌍 Project Purpose

This project is designed to:
- Load cross-country course geometries from an external API
- Sample route points efficiently (max 512)
- Call Google’s Elevation API just once per route
- Plot a clear elevation profile in the browser using SVG

## ⚙️ Features

- 🗺 Supports multiple route files (Melbourne, Bramham, Bromont, etc.)
- 📏 Smart coordinate sampling to stay under the 512-point API limit
- 📊 SVG-based elevation chart with interactive tooltips
- 🧭 Toggle route visibility and change colors via a clickable legend
- 🐞 Debug logging support (e.g., number of sampled points)


