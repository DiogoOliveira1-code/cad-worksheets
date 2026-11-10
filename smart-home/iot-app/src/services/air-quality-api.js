// API externa 2: qualidade do ar exterior (Open-Meteo Air Quality, sem chave).
// https://open-meteo.com/en/docs/air-quality-api
const config = require("../config");

async function getAirQuality() {
  const { latitude, longitude, timezone } = config.location;
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}` +
    `&current=european_aqi,pm2_5,pm10&timezone=${encodeURIComponent(timezone)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Air Quality: HTTP ${res.status}`);
  const data = await res.json();
  const c = data.current;

  return {
    europeanAqi: c.european_aqi,
    pm2_5: c.pm2_5,
    pm10: c.pm10
  };
}

module.exports = { getAirQuality };
