import { database } from "./firebase.js";
import { ref, onChildAdded } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const messagesContainer = document.getElementById("messages");
const messagesRef = ref(database, "messages");

onChildAdded(messagesRef, (snapshot) => {
  const data = snapshot.val();

  if (data && data.text && data.type) {
    const alertDiv = document.createElement("div");
    alertDiv.className = `alert alert-${data.type} shadow-sm mb-2`;
    alertDiv.textContent = data.text;

    // Se preferires que apareçam no topo, usa prepend (caso contrário, usa appendChild)
    messagesContainer.prepend(alertDiv);

    // --- EFEITO DE FADE OUT APÓS ALGUNS SEGUNDOS ---
    // Exemplo: Começa a desaparecer após 6 segundos (6000ms)
    setTimeout(() => {
      alertDiv.classList.add("fade-out"); // Aplica a classe CSS com opacidade 0

      // Remove o elemento do HTML após a animação terminar (1 segundo depois)
      setTimeout(() => {
        alertDiv.remove();
      }, 1000); 

    }, 6000);
  }
}, (error) => {
  console.error("Erro ao ler dados do Firebase:", error);
});