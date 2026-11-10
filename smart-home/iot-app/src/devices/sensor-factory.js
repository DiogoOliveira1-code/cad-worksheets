// Cria sensores reais (GPIO) ou simulados a partir da definição guardada na BD.
const gpio = require("../hardware/gpio");
const { SENSOR_TYPES, ACTUATOR_EFFECTS, ACTUATOR_POWER } = require("./device-types");

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const round1 = (v) => Math.round(v * 10) / 10;

/**
 * @param {object} def        definição do sensor (type, value, gpio, simulated...)
 * @param {function} getZoneActuators  devolve os atuadores atuais da divisão
 * @param {function} onImmediateChange chamado quando um sensor real muda de estado
 */
function createSensor(def, getZoneActuators, onImmediateChange) {
  const type = SENSOR_TYPES[def.type];
  if (!type) {
    console.warn(`[sensor] tipo desconhecido: ${def.type}`);
    return { read: () => def.value ?? null, dispose: () => {} };
  }

  // --- Sensor real (digital) ---
  if (def.simulated === false && type.boolean && Number.isInteger(def.gpio)) {
    let value = false;
    const input = gpio.openInput(def.gpio, (v) => {
      value = v;
      onImmediateChange(v);
    });
    if (!gpio.isMock) value = input.read() === 1;
    return { read: () => value, dispose: () => input.close() };
  }

  if (def.simulated === false && !type.boolean) {
    console.warn(`[sensor] ${def.name}: sensor real analógico não suportado ainda, a simular`);
  }

  // --- Sensor simulado ---
  if (type.boolean) {
    let value = def.value === true;
    return {
      read() {
        if (Math.random() < type.toggleChance) value = !value;
        return value;
      },
      dispose() {}
    };
  }

  let value = typeof def.value === "number" ? def.value : type.initial;

  return {
    read() {
      const actuators = Object.values(getZoneActuators() ?? {});

      if (def.type === "power") {
        // Consumo = base + soma dos atuadores ligados na divisão
        const load = actuators.filter((a) => a.state).reduce((sum, a) => sum + (ACTUATOR_POWER[a.type] ?? 0), 0);
        value = 40 + load + (Math.random() - 0.5) * type.noise * 2;
        return round1(clamp(value, type.min, type.max));
      }

      let delta = (Math.random() - 0.5) * type.noise * 2;
      for (const a of actuators) {
        if (a.state) delta += ACTUATOR_EFFECTS[a.type]?.[def.type] ?? 0;
      }
      // Sem atuadores ligados, tende a voltar ao valor inicial
      delta += (type.initial - value) * 0.02;

      value = clamp(value + delta, type.min, type.max);
      return round1(value);
    },
    dispose() {}
  };
}

module.exports = { createSensor };
