// Ecrã 1 — Visão geral da casa + divisões em tempo real.
// Requisitos: a) infos gerais, b) divisões, g) tempo real.
import { listen, patch } from "../services/data.js";
import { DB } from "../config/constants.js";
import { infoCard } from "../components/info-card.js";
import { zoneCard } from "../components/zone-card.js";
import { formatValue, formatTime, toast } from "../utils/format.js";

let zones = {};
let external = {};

/** Calcula os indicadores gerais a partir de todas as divisões. */
function computeSummary() {
  const temps = [];
  const hums = [];
  let power = 0;
  let openContacts = 0;
  let motion = 0;

  for (const zone of Object.values(zones)) {
    for (const s of Object.values(zone.sensors ?? {})) {
      if (s.type === "temperature" && typeof s.value === "number") temps.push(s.value);
      if (s.type === "humidity" && typeof s.value === "number") hums.push(s.value);
      if (s.type === "power" && typeof s.value === "number") power += s.value;
      if (s.type === "contact" && s.value === true) openContacts++;
      if (s.type === "motion" && s.value === true) motion++;
    }
  }

  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  return { avgTemp: avg(temps), avgHum: avg(hums), power, openContacts, motion };
}

function renderGeneralInfo() {
  const s = computeSummary();
  const w = external.weather ?? {};
  const aq = external.airQuality ?? {};
  const sun = external.sun ?? {};

  const secure = s.openContacts === 0;

  $("#general-info").html([
    infoCard({ icon: "fa-temperature-half", label: "Temperatura interior", value: formatValue(s.avgTemp, "°C"), detail: `Humidade ${formatValue(s.avgHum, "%")}` }),
    infoCard({ icon: "fa-bolt", label: "Consumo atual", value: formatValue(s.power, "W"), color: "warning" }),
    infoCard({
      icon: secure ? "fa-shield-halved" : "fa-triangle-exclamation",
      label: "Segurança",
      value: secure ? "Tudo fechado" : `${s.openContacts} aberta(s)`,
      detail: `${s.motion} divisão(ões) com movimento`,
      color: secure ? "success" : "danger"
    }),
    infoCard({
      icon: "fa-cloud-sun",
      label: "Exterior",
      value: formatValue(w.temperature, "°C"),
      detail: `AQI ${formatValue(aq.europeanAqi)} · ☀ ${formatTime(sun.sunrise)} – ${formatTime(sun.sunset)}`,
      color: "info"
    })
  ].join(""));
}

function renderZones() {
  const sorted = Object.entries(zones).sort(([, a], [, b]) => (a.order ?? 99) - (b.order ?? 99));
  $("#zones-container").html(
    sorted.length
      ? sorted.map(([id, z]) => zoneCard(id, z)).join("")
      : `<p class="text-muted">Ainda não existem divisões. Adicione no ecrã Dispositivos.</p>`
  );
}

export function initDashboard() {
  listen(DB.HOME, (home) => home?.name && $("#home-name").text(home.name));

  listen(DB.ZONES, (data) => {
    zones = data ?? {};
    renderZones();
    renderGeneralInfo();
  });

  listen(DB.EXTERNAL, (data) => {
    external = data ?? {};
    renderGeneralInfo();
  });

  // Ligar/desligar atuador: a SPA só escreve na BD; o IoT ouve e atua.
  $("#zones-container").on("click", ".js-toggle-actuator", async function () {
    const path = $(this).data("path");
    const current = $(this).data("state") === true;
    try {
      await patch(path, { state: !current, updatedAt: new Date().toISOString() });
    } catch (err) {
      toast("Erro ao alterar atuador: " + err.message, "danger");
    }
  });
}
