// nodejs-app/app.js
const { initializeApp, cert } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({
  credential: cert(serviceAccount),
  databaseURL: "https://cad-2023140288-default-rtdb.europe-west1.firebasedatabase.app"
});

const db = getDatabase();
const messagesRef = db.ref("messages");

// 1. Frases de exemplo solicitadas para o feed
const sentences = [
  "A new request was received.",
  "System backup completed successfully.",
  "Warning: High memory usage detected.",
  "Critical error: Connection lost to database server.",
  "User logged in from a new device."
];

// 2. Tipos de alertas do Bootstrap correspondentes
const types = ["success", "warning", "danger", "primary"];

// 3. Função que cria a mensagem aleatória e envia para o Firebase
function sendRandomMessage() {
  const randomSentence = sentences[Math.floor(Math.random() * sentences.length)];
  const randomType = types[Math.floor(Math.random() * types.length)];

  const message = {
    text: randomSentence,
    type: randomType
  };

  messagesRef.push(message, (error) => {
    if (error) {
      console.error("Error writing message:", error);
    } else {
      console.log("Message sent:", message);
    }
  });
}

// 4. Desafio C: Executar a função automaticamente a cada 5 segundos (5000 ms)
setInterval(sendRandomMessage, 5000);

console.log("Producer app running... Sending messages every 5 seconds.");