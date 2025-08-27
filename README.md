# Cross Country Elevation Profiles

A lightweight, browser-based tool that allows **event riders** to visualize **elevation over distance** for **equestrian cross-country courses**.

This application retrieves course data from the [CrossCountry App](https://www.crosscountryapp.com/) API and renders it as a clean, interactive elevation chart—helping riders preview the terrain before a ride.

---

## Live Demo

Access the application here:  
**[View Demo](https://sarika-sh.github.io/cross-country-elevation/)**

---

## How It Works

To explore course elevation profiles, use the demo link with the following sample course IDs:

- `gcptey` (Melbourne)  
- `vdwk2d` (Bramham)  
- `wplcez` (Bromont)

**Single course example:**  
`https://sarika-sh.github.io/cross-country-elevation/?ids=gcptey`

**Multiple course comparison:**  
`https://sarika-sh.github.io/cross-country-elevation/?ids=gcptey,vdwk2d,wplcez`

> *Note: Other course IDs may not return data consistently due to API constraints.*

---

## Features

- Interactive elevation graphs for equestrian cross-country routes  
- Relative elevation mode: All routes aligned to start at the same elevation for visual consistency  
- Unique color assigned per route  
- Clickable legend to toggle individual lines  
- Hover tooltips displaying distance and elevation  
- Fully responsive layout for desktop and mobile devices  

---

## Technologies Used

- HTML5  
- CSS3  
- JavaScript (Vanilla)  
- [Google Maps Elevation API](https://developers.google.com/maps/documentation/elevation/start)  
- [CrossCountry App API](https://www.crosscountryapp.com/)

---

cross-country-elevation

├── index.html # Main HTML entry point

├── script.js # Core logic (data fetch, rendering, interactivity)

├── style.css # Application styles

└── README.md # Project documentation


---

## Planned Enhancements

- Toggle between **relative** and **absolute** elevation modes  
- Improved mobile and touch interaction support  
- Option to export graphs as PNG images  
- Shareable URLs with preloaded course selections  

---

## Acknowledgements

- [CrossCountry App](https://www.crosscountryapp.com/) – for providing access to course data  
- [Google Maps Platform](https://developers.google.com/maps/documentation/elevation/start) – for elevation data services  

---


## Project Structure

