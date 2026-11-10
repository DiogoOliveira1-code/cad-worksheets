// Ponto de entrada da aplicação IoT.
//   npm start      -> no Raspberry Pi (GPIO real)
//   npm run mock   -> no PC (GPIO simulado)
const deviceManager = require("./devices/device-manager");
const externalData = require("./services/external-data");
const rulesEngine = require("./rules/rules-engine");

console.log("=== Smart Home IoT a arrancar ===");

deviceManager.start();
externalData.start();
rulesEngine.start();

// Desligar atuadores reais e libertar os GPIO ao sair (Ctrl+C)
function shutdown() {
  console.log("\nA terminar...");
  deviceManager.stop();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
