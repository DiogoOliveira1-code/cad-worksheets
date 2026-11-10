// Comportamento de cada tipo de dispositivo na simulação.
// Os nomes dos tipos são os mesmos de spa/js/config/constants.js.

// Sensores numéricos: gama, variação aleatória por ciclo e valor inicial
const SENSOR_TYPES = {
  temperature:   { min: 10, max: 40,    noise: 0.2, initial: 21,  unit: "°C" },
  humidity:      { min: 20, max: 95,    noise: 0.5, initial: 55,  unit: "%" },
  air_quality:   { min: 400, max: 2000, noise: 15,  initial: 600, unit: "ppm" },
  luminosity:    { min: 0, max: 1000,   noise: 10,  initial: 300, unit: "lx" },
  power:         { min: 0, max: 5000,   noise: 5,   initial: 50,  unit: "W" },
  soil_moisture: { min: 0, max: 100,    noise: 0.3, initial: 40,  unit: "%" },
  // Sensores digitais (true/false)
  motion:        { boolean: true, toggleChance: 0.1 },
  contact:       { boolean: true, toggleChance: 0.02 }
};

// Efeito dos atuadores LIGADOS sobre os sensores da MESMA divisão (por ciclo)
const ACTUATOR_EFFECTS = {
  hvac:       { temperature: -0.4, humidity: -0.3 },
  irrigation: { soil_moisture: +2, humidity: +0.3 },
  light:      { luminosity: +40 },
  blinds:     { luminosity: -30, temperature: -0.1 }, // estores fechados
  socket:     {},
  lock:       {}
};

// Consumo (W) de cada atuador quando ligado — alimenta o sensor "power"
const ACTUATOR_POWER = {
  hvac: 1200,
  irrigation: 300,
  light: 60,
  blinds: 0,
  socket: 150,
  lock: 5
};

module.exports = { SENSOR_TYPES, ACTUATOR_EFFECTS, ACTUATOR_POWER };
