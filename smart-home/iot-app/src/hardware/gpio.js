// Wrapper do módulo onoff. Fora do Raspberry Pi (ou com MOCK_GPIO=1)
// usa uma versão simulada, para se poder testar tudo no PC.
const config = require("../config");

let Gpio = null;
if (!config.mockGpio) {
  try {
    ({ Gpio } = require("onoff"));
    if (!Gpio.accessible) Gpio = null;
  } catch {
    Gpio = null;
  }
}

const isMock = Gpio === null;
if (isMock) console.log("[gpio] GPIO indisponível: a usar modo simulado (mock)");

/** Pino de saída (atuador real: LED, relé...). */
function openOutput(pin) {
  if (isMock) {
    let value = 0;
    return {
      write: (v) => { value = v ? 1 : 0; console.log(`[gpio mock] GPIO${pin} <- ${value}`); },
      read: () => value,
      close: () => {}
    };
  }
  const gpio = new Gpio(pin, "out");
  return {
    write: (v) => gpio.writeSync(v ? 1 : 0),
    read: () => gpio.readSync(),
    close: () => gpio.unexport()
  };
}

/** Pino de entrada (sensor real digital: PIR, contacto magnético, botão...). */
function openInput(pin, onChange) {
  if (isMock) {
    return { read: () => 0, close: () => {} };
  }
  const gpio = new Gpio(pin, "in", "both", { debounceTimeout: 50 });
  gpio.watch((err, value) => {
    if (err) return console.error(`[gpio] erro no GPIO${pin}:`, err.message);
    onChange(value === 1);
  });
  return {
    read: () => gpio.readSync(),
    close: () => gpio.unexport()
  };
}

module.exports = { openOutput, openInput, isMock };
