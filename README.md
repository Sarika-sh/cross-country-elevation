# 🏇 Cross Country Elevation Profiles

A lightweight, browser-based tool that lets **event riders** visualize **elevation over distance** for **equestrian cross-country courses**.

It fetches course data from the [CrossCountry App](https://www.crosscountryapp.com/) API and plots it as a clean, interactive elevation chart to help riders preview terrain before riding.

---

## 🔗 Live Demo

👉 [Try It Live](https://sarika-sh.github.io/cross-country-elevation/)  

---

## 📌 How It Works

To view course elevation profiles, you can use the live demo with the following course IDs, which are known to work well:

- `gcptey` (Melbourne)  
- `vdwk2d` (Bramham)  
- `wplcez` (Bromont)  

Use the live demo link with one or multiple IDs like this:  
`https://sarika-sh.github.io/cross-country-elevation/?ids=gcptey`

Or to compare multiple courses, separate IDs with commas:  
`https://sarika-sh.github.io/cross-country-elevation/?ids=gcptey,vdwk2d,wplcez`

> **Note:** Using other course IDs from the CrossCountry App may not always return data due to API limitations.

---

## 🎯 Features

- 📉 Elevation graphs for **horse riding cross-country** courses
- 📍 Relative elevation mode: All routes start at the same height for easy comparison
- 🎨 Unique color for each route
- 🧭 Interactive legend (click to toggle lines)
- 🧠 Hover tooltips with **distance** + **elevation**
- 📱 Fully responsive & mobile-friendly

---

## 🛠️ Built With

- **HTML5** + **CSS3**
- **JavaScript (Vanilla)**
- [Google Maps Elevation API](https://developers.google.com/maps/documentation/elevation/start)
- [CrossCountry App API](https://www.crosscountryapp.com/)

---

## 📁 Project Structure

📦 cross-country-elevation
├── index.html # Main HTML page
├── script.js # Core logic (fetch, render, tooltips)
├── style.css # Styles for the app
└── README.md # You're here!

---

## 💡 Future Improvements (Ideas)

- Option to switch between **relative** and **absolute** elevation modes
- Better mobile support & touch interactions
- Download graph as PNG
- Shareable links with pre-loaded IDs

---

## 🙏 Acknowledgements

- [CrossCountry App](https://www.crosscountryapp.com/) – for course data
- [Google Maps Platform](https://developers.google.com/maps/documentation/elevation/start) – for elevation data

---

