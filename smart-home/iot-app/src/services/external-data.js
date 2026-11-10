// Chama periodicamente as APIs externas e grava o resultado em /external.
// Cada API é independente: se uma falhar, as outras continuam a ser gravadas.
const { ref, now } = require("../firebase");
const config = require("../config");
const { getWeather } = require("./weather-api");
const { getAirQuality } = require("./air-quality-api");
const { getSun } = require("./sun-api");

const SOURCES = {
  weather: getWeather,
  airQuality: getAirQuality,
  sun: getSun
};

async function refresh() {
  const updates = {};

  await Promise.all(Object.entries(SOURCES).map(async ([key, fn]) => {
    try {
      updates[key] = await fn();
    } catch (err) {
      console.error(`[external] ${key} falhou:`, err.message);
    }
  }));

  if (Object.keys(updates).length) {
    updates.updatedAt = now();
    await ref("external").update(updates);
    console.log(`[external] atualizado: ${Object.keys(updates).filter((k) => k !== "updatedAt").join(", ")}`);
  }
}

function start() {
  refresh();
  setInterval(refresh, config.externalDataInterval);
}

module.exports = { start, refresh };
