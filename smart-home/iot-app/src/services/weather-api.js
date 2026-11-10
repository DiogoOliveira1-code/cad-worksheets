// API externa 1: meteorologia (Open-Meteo, gratuita, sem chave).
// https://open-meteo.com/en/docs
const config = require("../config");

async function getWeather() {
  const { latitude, longitude, timezone } = config.location;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
    `&timezone=${encodeURIComponent(timezone)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo: HTTP ${res.status}`);
  const data = await res.json();
  const c = data.current;

  return {
    temperature: c.temperature_2m,
    humidity: c.relative_humidity_2m,
    windSpeed: c.wind_speed_10m,
    weatherCode: c.weather_code
  };
}

module.exports = { getWeather };
