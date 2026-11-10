// Configuração central do dispositivo IoT.
const path = require("path");

module.exports = {
  // URL exato da Realtime Database (consola Firebase -> Realtime Database)
  databaseURL: "https://PREENCHER-default-rtdb.europe-west1.firebasedatabase.app",

  // Chave da service account (Project settings -> Service accounts -> Generate private key)
  serviceAccountPath: path.join(__dirname, "..", "serviceAccountKey.json"),

  // Intervalos (ms)
  sensorPublishInterval: 5000,        // envio periódico das leituras
  rulesEvaluationInterval: 2000,      // avaliação das regras
  externalDataInterval: 10 * 60 * 1000, // APIs externas (10 min)

  // Localização da casa (usada pelas APIs externas) — Leiria
  location: { latitude: 39.7436, longitude: -8.8071, timezone: "Europe/Lisbon" },

  // Força o modo simulado do GPIO (útil para correr no PC): npm run mock
  mockGpio: process.argv.includes("--mock") || process.env.MOCK_GPIO === "1"
};
