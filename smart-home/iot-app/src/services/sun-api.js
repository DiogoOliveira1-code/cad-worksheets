// API externa 3: nascer e pôr do sol (sunrise-sunset.org, sem chave).
// https://sunrise-sunset.org/api
const config = require("../config");

async function getSun() {
  const { latitude, longitude } = config.location;
  const url = `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&formatted=0`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sunrise-Sunset: HTTP ${res.status}`);
  const data = await res.json();
  if (data.status !== "OK") throw new Error(`Sunrise-Sunset: ${data.status}`);

  const sunrise = data.results.sunrise; // ISO 8601 em UTC
  const sunset = data.results.sunset;
  const t = Date.now();

  return {
    sunrise,
    sunset,
    isDay: t >= Date.parse(sunrise) && t < Date.parse(sunset)
  };
}

module.exports = { getSun };
