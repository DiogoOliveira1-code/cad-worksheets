// Ecrã 1 — Visão geral da casa + casa 3D + painel lateral da divisão.
// Requisitos: a) infos gerais, b) divisões, g) tempo real.
import { listen, patch } from "../services/data.js";
import { DB } from "../config/constants.js";
import { infoCard } from "../components/info-card.js";
import { zoneCard } from "../components/zone-card.js";
import { createRoomPanel } from "../components/room-panel.js";
import { formatValue, formatTime, toast } from "../utils/format.js";

const HINT = "Arraste para rodar · roda do rato para zoom · clique numa divisão";

let zones = {};
let external = {};

// Casa 3D (fica null se o Three.js não carregar ou o browser não suportar WebGL)
let house3d = null;
let environment3d = null;
let camera3d = null;
let panel = null;

/** Escrita comum aos controlos: a SPA só escreve na BD; o IoT ouve e atua. */
async function setActuator(path, fields) {
  try {
    await patch(path, { ...fields, updatedAt: new Date().toISOString() });
  } catch (err) {
    toast("Erro ao alterar atuador: " + err.message, "danger");
  }
}

/** Abre a divisão: seleciona no 3D, aproxima a câmara e abre o painel lateral. */
function openRoom(zoneId) {
  house3d?.select(zoneId);
  const box = house3d?.roomBox(zoneId);
  if (box) camera3d?.focusBox(box);
  panel.open(zoneId, zones[zoneId]);
  $("#house-3d-overlay").text(zones[zoneId]?.name ?? zoneId);
}

function closeRoom() {
  house3d?.select(null);
  if (house3d) camera3d?.overview(house3d.houseBox());
  $("#house-3d-overlay").text(HINT);
}

/**
 * Arranca a cena 3D. O import é dinâmico: se o Three.js falhar (sem internet,
 * sem WebGL…), o resto do painel continua a funcionar e mostra a lista.
 */
async function init3D() {
  const container = document.getElementById("house-3d");
  try {
    const { createScene } = await import("../scene3d/scene.js");
    const { createEnvironment } = await import("../scene3d/environment.js");
    const { createHouse } = await import("../scene3d/house-builder.js");
    const { setupPicking } = await import("../scene3d/picking.js");
    const { createCameraMoves } = await import("../scene3d/camera-moves.js");

    const ctx = createScene(container);
    environment3d = createEnvironment(ctx);
    house3d = createHouse(ctx, environment3d);
    camera3d = createCameraMoves(ctx);

    setupPicking(ctx, () => house3d.pickTargets(), (obj) => {
      const zoneId = obj?.userData.zoneId ?? null;
      if (zoneId) openRoom(zoneId);
      else panel.close();
    });

    // Desenha com os dados que já tenham chegado
    house3d.update(zones);
    environment3d.setDaylight(external.sun?.isDay !== false);
  } catch (err) {
    console.error("[3d] não foi possível iniciar a cena 3D:", err);
    container.innerHTML = `<div class="house-3d-error">Não foi possível mostrar a casa 3D neste browser.</div>`;
    showList(true);
  }
}

function showList(show) {
  $("#zones-container").toggleClass("d-none", !show);
  $("#toggle-list span").text(show ? "Esconder lista" : "Ver em lista");
}

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
      if ((s.type === "motion" || s.type === "ir_barrier") && s.value === true) motion++;
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
  panel = createRoomPanel({
    onToggle: (path, state) => setActuator(path, { state }),
    onLevel: (path, level) => setActuator(path, { level }),
    onClose: closeRoom
  });

  listen(DB.HOME, (home) => home?.name && $("#home-name").text(home.name));

  init3D();

  listen(DB.ZONES, (data) => {
    zones = data ?? {};
    renderZones();
    renderGeneralInfo();
    house3d?.update(zones);
    panel.update(zones);
  });

  listen(DB.EXTERNAL, (data) => {
    external = data ?? {};
    renderGeneralInfo();
    environment3d?.setDaylight(external.sun?.isDay !== false);
  });

  // Ao sair do ecrã principal, fecha o painel lateral
  window.addEventListener("hashchange", () => {
    if (!location.hash.startsWith("#dashboard") && location.hash !== "") panel.close();
  });

  $("#toggle-list").on("click", () => showList($("#zones-container").hasClass("d-none")));

  // Botões dos cartões da lista
  $("#zones-container").on("click", ".js-toggle-actuator", function () {
    setActuator($(this).data("path"), { state: !($(this).data("state") === true) });
  });
}
