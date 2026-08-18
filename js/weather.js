/* ============================================================
   Dülük Hub — weather.js
   Header'da basit sıcaklık göstergesi.
   ============================================================ */

const LAT = 37.07;
const LON = 37.38;

const WMO_ICONS = {
    0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
    45: "🌫️", 48: "🌫️",
    51: "🌦️", 53: "🌦️", 55: "🌧️",
    61: "🌧️", 63: "🌧️", 65: "🌧️",
    71: "🌨️", 73: "🌨️", 75: "❄️",
    80: "🌦️", 81: "🌧️", 82: "⛈️",
    95: "⛈️", 96: "⛈️", 99: "⛈️"
};

export async function renderWeatherBadge() {
    const el = document.querySelector(".header-actions");
    if (!el) return;

    try {
        const url = "https://api.open-meteo.com/v1/forecast" +
            "?latitude=" + LAT +
            "&longitude=" + LON +
            "&current=temperature_2m,weather_code" +
            "&timezone=Europe/Istanbul";

        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        const temp = Math.round(data.current.temperature_2m);
        const icon = WMO_ICONS[data.current.weather_code] || "🌡️";

        const badge = document.createElement("span");
        badge.className = "weather-badge";
        badge.textContent = icon + " " + temp + "°C";
        badge.title = "Dülük — anlık sıcaklık";
        el.prepend(badge);
    } catch (_) {}
}
