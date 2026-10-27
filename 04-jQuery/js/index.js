"use strict";

$(document).ready(function () {

    // ==========================================
    // 1. RELÓGIO E DATA
    // ==========================================
    function updateClockAndDate() {
        var now = new Date();

        var year = now.getFullYear();
        var month = String(now.getMonth() + 1).padStart(2, '0'); 
        var day = String(now.getDate()).padStart(2, '0');
        var currentDateString = year + "-" + month + "-" + day;

        var hours = String(now.getHours()).padStart(2, '0');
        var minutes = String(now.getMinutes()).padStart(2, '0');
        var seconds = String(now.getSeconds()).padStart(2, '0');
        var currentTimeString = hours + ":" + minutes + ":" + seconds;

        $("#clock-time").text(" " + currentTimeString);
        $("#clock-date").text(" " + currentDateString);
    }

    updateClockAndDate();
    setInterval(updateClockAndDate, 1000); // Atualiza a cada segundo


    // ==========================================
    // 2. SIMULAÇÃO DE SENSORES INTERNOS (TEMPERATURA)
    // ==========================================
    function updateRoomTemperatures() {
        $("span.fw-semibold").each(function () {
            if ($(this).text().includes("Temperature")) {
                var randomTemp = (Math.random() * (30 - 10) + 10).toFixed(1);
                $(this).text("Temperature " + randomTemp + " °C");
            }
        });
    }

    setInterval(updateRoomTemperatures, 5000);


    // ==========================================
    // 3. INTERRUPTORES / SWITCHES (INTERFACE)
    // ==========================================
    function handleToggle(event) {
        const switchElement = event.target;
        const switchId = switchElement.id;
        const isChecked = switchElement.checked;

        const listItem = switchElement.closest("li");
        if (!listItem) return;

        const iconElement = listItem.querySelector("i");
        const textElement = listItem.querySelector("span");

        if (switchId === "switch_lights") {
            textElement.textContent = isChecked ? "Lights On" : "Lights Off";
            iconElement.classList.toggle("fa-solid", isChecked);
            iconElement.classList.toggle("fa-regular", !isChecked);
        } else if (switchId === "ceiling_lights_switch") {
            textElement.textContent = isChecked ? "Ceiling Lights On" : "Ceiling Lights Off";
            iconElement.classList.toggle("fa-solid", isChecked);
            iconElement.classList.toggle("fa-regular", !isChecked);
        } else if (switchId === "ambient_lights_switch") {
            textElement.textContent = isChecked ? "Ambient Lights On" : "Ambient Lights Off";
            iconElement.classList.toggle("fa-solid", isChecked);
            iconElement.classList.toggle("fa-regular", !isChecked);
        } else if (switchId === "ambient_music_switch") {
            textElement.textContent = isChecked ? "Ambient Music On" : "Ambient Music Off";
            iconElement.classList.toggle("text-info", isChecked);
            iconElement.classList.toggle("text-secondary", !isChecked);
        }
    }

    $(".form-switch input[type='checkbox']").on("change", handleToggle);


    // ==========================================
    // 4. METEOROLOGIA (AJAX / API EXTERNA)
    // ==========================================
    const apiKey = "8dae437f267b34d85a38e784e1191595"; 

    function fetchWeatherData(city) {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

        $.ajax({
            url: url,
            method: "GET",
            dataType: "json"
        }).done(function (data) {
            // Atualiza as Temperaturas e Humidade
            $("#weather-temp").text(data.main.temp.toFixed(2) + " °C");
            $("#weather-temp-max").text(data.main.temp_max.toFixed(2) + " °C");
            $("#weather-temp-min").text(data.main.temp_min.toFixed(2) + " °C");
            $("#weather-humidity").text(data.main.humidity + "%");

            // Converte Unix Timestamp para Hora Formatada (HH:MM)
            const sunriseTime = new Date(data.sys.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const sunsetTime = new Date(data.sys.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            $("#weather-sunrise").text(sunriseTime);
            $("#weather-sunset").text(sunsetTime);

            // Atualiza o relógio do cartão "Clock" com o Sunrise/Sunset da cidade
            $("#clock-sunrise-sunset").text(`${sunriseTime} / ${sunsetTime}`);

            // Regista a hora da última atualização do cartão
            const now = new Date();
            const timeString = now.toLocaleTimeString();
            $("#weather-last-update").text("Updated at " + timeString);

        }).fail(function (xhr) {
            alert("Não foi possível carregar a meteorologia para a cidade inserida.");
            console.error("Erro na requisição meteorológica:", xhr.statusText);
        });
    }

    // Evento do clique no botão "Get"
    $("#get-weather-btn").on("click", function () {
        const city = $("#city-input").val().trim() || "Leiria";
        fetchWeatherData(city);
    });

    // Carregamento inicial automático com o valor do input (Leiria)
    fetchWeatherData($("#city-input").val().trim() || "Leiria");

});