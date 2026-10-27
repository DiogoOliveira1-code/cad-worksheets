const { initializeApp, cert } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const serviceAccount = require("./serviceAccountKey.json");

// 1. Inicializar o Firebase Admin SDK com a URL correta da base de dados (europe-west1)
initializeApp({
  credential: cert(serviceAccount),
  databaseURL: "https://cad-2023140288-default-rtdb.europe-west1.firebasedatabase.app"
});

const db = getDatabase();
const sensorsRef = db.ref("greenhouse/sensors");
const actuatorsRef = db.ref("greenhouse/actuators");

// Valores iniciais padrão dentro dos limites
let currentTemp = 25.0; // °C (10 a 45)
let currentHumidity = 60.0; // % (20 a 95)
let currentLuminosity = 20000; // lx (0 a 50000)

// Estado atual dos atuadores controlado pela Web app
let actuatorsState = {
  fan: false,
  irrigation: false
};

// 2. Ouvir alterações nos estados dos atuadores em tempo real
actuatorsRef.on("value", (snapshot) => {
  const data = snapshot.val();
  if (data) {
    actuatorsState.fan = data.fan || false;
    actuatorsState.irrigation = data.irrigation || false;
    console.log("Estado dos atuadores atualizado:", actuatorsState);
  }
});

// Função auxiliar para gerar um número inteiro aleatório entre min e max
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 3. Função para simular a variação gradual e a reatividade física
function simulateSensors() {
  // --- TEMPERATURA & REATIVIDADE DA VENTOINHA (FAN) ---
  let tempChange = Math.random() * 3 - 1.5; // Variação natural (-1.5 a +1.5)
  if (actuatorsState.fan) {
    tempChange -= 2.0; // Se a ventoinha estiver ligada, a temperatura desce mais
  }
  currentTemp += tempChange;
  currentTemp = Math.max(10, Math.min(45, currentTemp)); // Limites: 10°C a 45°C[cite: 2]

  // --- HUMIDADE & REATIVIDADE DA REGA (IRRIGATION) ---
  let humChange = Math.random() * 6 - 3; // Variação natural (-3 a +3)
  if (actuatorsState.irrigation) {
    humChange += 4.0; // Se a rega estiver ligada, a humidade sobe mais
  }
  currentHumidity += humChange;
  currentHumidity = Math.max(20, Math.min(95, currentHumidity)); // Limites: 20% a 95%[cite: 2]

  // --- LUMINOSIDADE ---
  currentLuminosity += getRandomInt(-2000, 2000);
  currentLuminosity = Math.max(0, Math.min(50000, currentLuminosity)); // Limites: 0 a 50000 lx[cite: 2]

  // Objeto com os dados finais a enviar
  const sensorData = {
    temperature: parseFloat(currentTemp.toFixed(1)),
    humidity: parseFloat(currentHumidity.toFixed(1)),
    luminosity: Math.round(currentLuminosity),
    timestamp: new Date().toLocaleTimeString()
  };

  // Enviar/Atualizar no Firebase a cada 5 segundos
  sensorsRef.set(sensorData, (error) => {
    if (error) {
      console.error("Erro ao atualizar sensores:", error);
    } else {
      console.log("Sensores atualizados (com reatividade):", sensorData);
    }
  });
}

// Executar a cada 5 segundos (5000 ms)
setInterval(simulateSensors, 5000);

console.log("Smart Greenhouse Simulator (com Reatividade) a correr...");