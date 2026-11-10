// Cria atuadores reais (GPIO) ou simulados.
const gpio = require("../hardware/gpio");

function createActuator(def) {
  if (def.simulated === false && Number.isInteger(def.gpio)) {
    const output = gpio.openOutput(def.gpio);
    output.write(def.state === true);
    return {
      apply: (state) => output.write(state),
      dispose: () => { output.write(false); output.close(); }
    };
  }

  // Simulado: o estado fica só na BD e influencia os sensores da divisão
  return {
    apply: (state) => console.log(`[atuador sim] ${def.name} -> ${state ? "ON" : "OFF"}`),
    dispose: () => {}
  };
}

module.exports = { createActuator };
