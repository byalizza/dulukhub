/* ============================================================
   Dülük Hub — weather.js
   Header'da sıcaklık + durum + yarın paneli.
   ============================================================ */

const LAT = 37.150;
const LON = 37.367;

const WMO = {
    0: ["☀️", "Güneşli"], 1: ["🌤️", "Az bulutlu"], 2: ["⛅", "Parçalı bulutlu"], 3: ["☁️", "Kapalı"],
    45: ["🌫️", "Sisli"], 48: ["🌫️", "Sisli"],
    51: ["🌦️", "Çiseleme"], 53: ["🌦️", "Çiseleme"], 55: ["🌧️", "Şiddetli yağmur"],
    61: ["🌧️", "Yağmur"], 63: ["🌧️", "Yağmur"], 65: ["🌧️", "Şiddetli yağmur"],
    71: ["🌨️", "Kar"], 73: ["🌨️", "Kar"], 75: ["❄️", "Şiddetli kar"],
    80: ["🌦️", "Sağanak"], 81: ["🌧️", "Sağanak"], 82: ["⛈️", "Fırtına"],
    95: ["⛈️", "Fırtına"], 96: ["⛈️", "Hortum"], 99: ["⛈️", "Şiddetli fırtına"]
};

const GUN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

function wmo(code) {
    return WMO[code] || ["🌡️", "Bilinmiyor"];
}

export async function renderWeatherBadge() {
    const el = document.querySelector("#weatherBadgeGlobal");
    if (!el) return;

    async function update() {
        try {
            const url = "https://api.open-meteo.com/v1/forecast" +
                "?latitude=" + LAT + "&longitude=" + LON +
                "&current=temperature_2m,weather_code" +
                "&daily=weather_code,temperature_2m_max,temperature_2m_min" +
                "&timezone=Europe/Istanbul&forecast_days=2";

            const res = await fetch(url);
            if (!res.ok) return;
            const data = await res.json();

            const cur = data.current;
            const [curIcon, curLabel] = wmo(cur.weather_code);
            const curTemp = Math.round(cur.temperature_2m);

            let html = '<span class="wb-now">' + curIcon + ' ' + curTemp + '° ' + curLabel + '</span>';

            if (data.daily && data.daily.time && data.daily.time[1]) {
                const [tomIcon] = wmo(data.daily.weather_code[1]);
                const tomMax = Math.round(data.daily.temperature_2m_max[1]);
                const tomMin = Math.round(data.daily.temperature_2m_min[1]);
                const tomDate = new Date(data.daily.time[1] + "T12:00:00");
                const gunAdi = GUN[tomDate.getDay()];
                html += '<span class="wb-sep">|</span>';
                html += '<span class="wb-tom">Yarın ' + gunAdi + ': ' + tomIcon + ' ' + tomMax + '° / ' + tomMin + '°</span>';
            }

            el.innerHTML = html;
        } catch (_) {}
    }

    update();
    setInterval(update, 10000);
}
