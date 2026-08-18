/* ============================================================
   Dülük Hub — weather.js
   Hava durumu widget'ı: Open-Meteo API ile Dülük/Gaziantep
   için anlık ve 5 günlük hava durumu.
   ============================================================ */

import { $, esc } from "./app.js";

const LAT = 37.07;
const LON = 37.38;

const WMO_ICONS = {
    0: { icon: "☀️", label: "Güneşli" },
    1: { icon: "🌤️", label: "Az bulutlu" },
    2: { icon: "⛅", label: "Parçalı bulutlu" },
    3: { icon: "☁️", label: "Kapalı" },
    45: { icon: "🌫️", label: "Sisli" },
    48: { icon: "🌫️", label: "Sisli" },
    51: { icon: "🌦️", label: "Hafif çiseleme" },
    53: { icon: "🌦️", label: "Çiseleme" },
    55: { icon: "🌧️", label: "Şiddetli çiseleme" },
    61: { icon: "🌧️", label: "Hafif yağmur" },
    63: { icon: "🌧️", label: "Yağmur" },
    65: { icon: "🌧️", label: "Şiddetli yağmur" },
    71: { icon: "🌨️", label: "Hafif kar" },
    73: { icon: "🌨️", label: "Kar" },
    75: { icon: "❄️", label: "Şiddetli kar" },
    80: { icon: "🌦️", label: "Hafif sağanak" },
    81: { icon: "🌧️", label: "Sağanak" },
    82: { icon: "⛈️", label: "Şiddetli sağanak" },
    95: { icon: "⛈️", label: "Gök gürültülü fırtına" },
    96: { icon: "⛈️", label: "Hortumlu fırtına" },
    99: { icon: "⛈️", label: "Şiddetli fırtına" }
};

const DAY_NAMES = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

function getWeatherInfo(code) {
    return WMO_ICONS[code] || { icon: "🌡️", label: "Bilinmiyor" };
}

export async function renderWeatherWidget(container) {
    if (!container) return;

    container.innerHTML =
        '<div class="weather-widget loading">' +
        '<div class="weather-loading">' +
        '<div class="weather-spinner"></div>' +
        '<span>Hava durumu yükleniyor...</span>' +
        '</div></div>';

    try {
        const url = "https://api.open-meteo.com/v1/forecast" +
            "?latitude=" + LAT +
            "&longitude=" + LON +
            "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m" +
            "&daily=weather_code,temperature_2m_max,temperature_2m_min" +
            "&timezone=Europe/Istanbul" +
            "&forecast_days=5";

        const res = await fetch(url);
        if (!res.ok) throw new Error("Hava durumu alınamadı");
        const data = await res.json();

        const current = data.current;
        const daily = data.daily;
        const info = getWeatherInfo(current.weather_code);

        let html = '<div class="weather-widget">' +
            '<div class="weather-main">' +
            '<div class="weather-icon-large">' + info.icon + '</div>' +
            '<div class="weather-temp">' + Math.round(current.temperature_2m) + '°C</div>' +
            '<div class="weather-desc">' + esc(info.label) + '</div>' +
            '</div>' +
            '<div class="weather-details">' +
            '<div class="weather-detail">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/></svg>' +
            '<span>Hissedilen: ' + Math.round(current.apparent_temperature) + '°C</span>' +
            '</div>' +
            '<div class="weather-detail">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>' +
            '<span>Nem: %' + current.relative_humidity_2m + '</span>' +
            '</div>' +
            '<div class="weather-detail">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.7 7.7a7.5 7.5 0 1 0-10.1 10.8"/><path d="M18 12h.01"/><path d="M12 2v2"/><path d="M2 12h2"/><path d="M20 12h2"/></svg>' +
            '<span>Rüzgâr: ' + Math.round(current.wind_speed_10m) + ' km/s</span>' +
            '</div>' +
            '</div>';

        if (daily && daily.time) {
            html += '<div class="weather-forecast">';
            for (let i = 1; i < Math.min(daily.time.length, 5); i++) {
                const date = new Date(daily.time[i] + "T12:00:00");
                const dayName = DAY_NAMES[date.getDay()];
                const fInfo = getWeatherInfo(daily.weather_code[i]);
                html += '<div class="forecast-day">' +
                    '<span class="forecast-label">' + dayName + '</span>' +
                    '<span class="forecast-icon">' + fInfo.icon + '</span>' +
                    '<span class="forecast-temp">' +
                    '<span class="forecast-max">' + Math.round(daily.temperature_2m_max[i]) + '°</span>' +
                    '<span class="forecast-min">' + Math.round(daily.temperature_2m_min[i]) + '°</span>' +
                    '</span></div>';
            }
            html += '</div>';
        }

        html += '</div>';
        container.innerHTML = html;

    } catch (err) {
        console.warn("Hava durumu yüklenemedi:", err);
        container.innerHTML =
            '<div class="weather-widget weather-error">' +
            '<div class="weather-icon-large">🌤️</div>' +
            '<p>Hava durumu yüklenemedi.</p>' +
            '</div>';
    }
}
