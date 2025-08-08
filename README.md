# 🏇 Cross Country Elevation Profiles

A lightweight, browser-based tool that lets event riders visualize **elevation over distance** for **equestrian cross-country courses**.

It fetches course data from the [CrossCountry App](https://www.crosscountryapp.com/) API and plots it as a clean elevation chart to help riders preview terrain changes before riding.

---

## 🔗 Live Demo

👉 [Try the Live Demo](https://sarika-sh.github.io/cross-country-elevation/)  

---

## 📌 How It Works

To view specific courses:

1. Visit [CrossCountryApp Courses](https://www.crosscountryapp.com/courses)
2. Click any **"View"** button  
3. Copy the **last part** of the URL (e.g., `gcptey`)
4. Paste it into the demo link like this:

https://sarika-sh.github.io/cross-country-elevation/?ids=gcptey,vdwk2d


You can load **multiple course IDs** by separating them with commas.

➡️ Example format:  
https://your-site.com/index.html?ids=courseId1,courseId2



---

## 🎯 Features

- 📉 Plots elevation charts for cross-country horse riding courses
- 🎨 Each course shown in a unique color
- 🔍 Hover tooltips with distance + elevation
- 📍 Clickable legend to toggle visibility
- 🎚 Relative elevation comparison (starts all lines from the same Y-axis point)
- 💡 Lightweight & responsive

---

## 🛠️ Built With

- **HTML5**
- **CSS3**
- **JavaScript**
- **Google Maps Elevation API**
- **CrossCountry App API**

---

## 📁 Folder Structure

📦 cross-country-elevation
├── index.html
├── script.js
├── style.css
└── README.md


---

## 🙌 Acknowledgments

- [CrossCountry App](https://www.crosscountryapp.com/) for course data
- [Google Maps Platform](https://developers.google.com/maps/documentation/elevation/start) for Elevation API


