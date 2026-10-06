"use strict";

(function () {
    function updateClockAndDate() {
    var now = new Date();

    // 1. Formatar a Data (AAAA-MM-DD)
    var year = now.getFullYear();
    // String().padStart(2, '0') garante que meses/dias menores que 10 fiquem com 2 dígitos (ex: "09")
    var month = String(now.getMonth() + 1).padStart(2, '0'); 
    var day = String(now.getDate()).padStart(2, '0');
    var currentDateString = year + "-" + month + "-" + day;

    // 2. Formatar a Hora (HH:MM:SS)
    var hours = String(now.getHours()).padStart(2, '0');
    var minutes = String(now.getMinutes()).padStart(2, '0');
    var seconds = String(now.getSeconds()).padStart(2, '0');
    var currentTimeString = hours + ":" + minutes + ":" + seconds;

    // 3. Atualizar diretamente os elementos do relógio
    document.getElementById("clock-time").textContent = " " + currentTimeString;
    document.getElementById("clock-date").textContent = " " + currentDateString;
}

// Executa imediatamente quando a página carrega
updateClockAndDate();


// Atualiza automaticamente a cada 5 segundos (5000ms)
setInterval(updateClockAndDate, 5000);


    var temperatureValue = function () {
        // Procura os elementos <span> que contêm as temperaturas nas divisões
        var tempElements = document.querySelectorAll("span.fw-semibold");

        tempElements.forEach(function (element) {
            // Verifica se o texto atual do elemento é de temperatura
            if (element.textContent.includes("Temperature")) {

                // Gera um número aleatório diferente para CADA elemento/divisão
                var randomTemp = (Math.random() * (30 - 10) + 10).toFixed(1);

                // Atualiza o texto do elemento atual
                element.textContent = "Temperature " + randomTemp + " °C";
            }
        });
    };

    // Executa a cada 5 segundos
    var clockInterval = setInterval(temperatureValue, 5000);


    // Função central automatizada que trata as alterações dos switches
    function handleToggle(event) {
        const switchElement = event.target;
        const switchId = switchElement.id;
        const isChecked = switchElement.checked;

        // Procura a linha (<li>) onde o switch está inserido
        const listItem = switchElement.closest("li");
        if (!listItem) return;

        // Procura o ícone e o texto dentro da mesma linha
        const iconElement = listItem.querySelector("i");
        const textElement = listItem.querySelector("span");

        // 1. Trata o Switch das Luzes da Cozinha
        if (switchId === "switch_lights") {
            if (isChecked) {
                textElement.textContent = "Lights On";
                iconElement.classList.remove("fa-regular");
                iconElement.classList.add("fa-solid");
            } else {
                textElement.textContent = "Lights Off";
                iconElement.classList.remove("fa-solid");
                iconElement.classList.add("fa-regular");
            }
        }
        // 2. Trata o Switch de Ceiling Lights (Sala)
        else if (switchId === "ceiling_lights_switch") {
            if (isChecked) {
                textElement.textContent = "Ceiling Lights On";
                iconElement.classList.remove("fa-regular");
                iconElement.classList.add("fa-solid");
            } else {
                textElement.textContent = "Ceiling Lights Off";
                iconElement.classList.remove("fa-solid");
                iconElement.classList.add("fa-regular");
            }
        }
        // 3. Trata o Switch de Ambient Lights (Sala)
        else if (switchId === "ambient_lights_switch") {
            if (isChecked) {
                textElement.textContent = "Ambient Lights On";
                iconElement.classList.remove("fa-regular");
                iconElement.classList.add("fa-solid");
            } else {
                textElement.textContent = "Ambient Lights Off";
                iconElement.classList.remove("fa-solid");
                iconElement.classList.add("fa-regular");
            }
        }
        // 4. Trata o Switch de Musica Ambiental (Sala)
        else if (switchId === "ambient_music_switch") {
            if (isChecked) {
                textElement.textContent = "Ambient Music On";
                iconElement.classList.remove("text-secondary");
                iconElement.classList.add("text-info");
            } else {
                textElement.textContent = "Ambient Music Off";
                iconElement.classList.remove("text-info");
                iconElement.classList.add("text-secondary");
            }
        }
    }
    

    // Procura todos os elementos switch da página e associa o handler
    const switches = document.querySelectorAll(".form-switch input[type='checkbox']");

    switches.forEach(function (switchInput) {
        switchInput.addEventListener("change", handleToggle);
    });

})();