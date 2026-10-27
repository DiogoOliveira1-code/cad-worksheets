import { database } from "./firebase.js";
import { ref, onValue, set } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// 1. Referências do Firebase
const sensorsRef = ref(database, "greenhouse/sensors");
const actuatorsRef = ref(database, "greenhouse/actuators");

// 2. Escutar e atualizar os Sensores em tempo real
onValue(sensorsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        document.getElementById("temp-val").textContent = `${data.temperature} °C`;
        document.getElementById("temp-time").textContent = `Sample reading at ${data.timestamp}`;

        document.getElementById("hum-val").textContent = `${data.humidity} %`;
        document.getElementById("hum-time").textContent = `Sample reading at ${data.timestamp}`;

        document.getElementById("lum-val").textContent = `${data.luminosity.toLocaleString()} lux`;
        document.getElementById("lum-time").textContent = `Sample reading at ${data.timestamp}`;
    }
});

// 3. Escutar e atualizar os Atuadores em tempo real
onValue(actuatorsRef, (snapshot) => {
    const actuators = snapshot.val();
    if (actuators) {
        const horaAtual = new Date().toLocaleTimeString();

        // --- Ventoinha (Fan) ---
        const fanState = actuators.fan || false;
        const fanBadge = document.getElementById("fan-badge");
        const fanBtn = document.getElementById("fan-btn");
        const fanTime = document.getElementById("fan-time");
        
        if (fanState) {
            fanBadge.textContent = "ON";
            fanBadge.className = "badge bg-success";
            fanBtn.textContent = "Turn off";
            fanBtn.className = "btn btn-outline-danger btn-sm";
        } else {
            fanBadge.textContent = "OFF";
            fanBadge.className = "badge bg-secondary";
            fanBtn.textContent = "Turn on";
            fanBtn.className = "btn btn-outline-primary btn-sm";
        }
        // Atualiza a linha do "Sample state at"
        fanTime.textContent = `Sample state at ${horaAtual}`;

        // --- Rega (Irrigation) ---
        const irrState = actuators.irrigation || false;
        const irrBadge = document.getElementById("irr-badge");
        const irrBtn = document.getElementById("irr-btn");
        const irrTime = document.getElementById("irr-time");

        if (irrState) {
            irrBadge.textContent = "ON";
            irrBadge.className = "badge bg-success";
            irrBtn.textContent = "Turn off";
            irrBtn.className = "btn btn-outline-danger btn-sm";
        } else {
            irrBadge.textContent = "OFF";
            irrBadge.className = "badge bg-secondary";
            irrBtn.textContent = "Turn on";
            irrBtn.className = "btn btn-outline-primary btn-sm";
        }
        // Atualiza a linha do "Sample state at"
        irrTime.textContent = `Sample state at ${horaAtual}`;
    }
});

// 4. Eventos de clique nos botões para alterar o estado no Firebase
document.getElementById("fan-btn").addEventListener("click", () => {
    const fanBadge = document.getElementById("fan-badge");
    const newState = fanBadge.textContent === "OFF"; // Se está OFF, passa para true (ON)
    
    // Atualiza no Firebase (o Node.js vai ler esta alteração)
    set(ref(database, "greenhouse/actuators/fan"), newState);
});

document.getElementById("irr-btn").addEventListener("click", () => {
    const irrBadge = document.getElementById("irr-badge");
    const newState = irrBadge.textContent === "OFF";
    
    set(ref(database, "greenhouse/actuators/irrigation"), newState);
});