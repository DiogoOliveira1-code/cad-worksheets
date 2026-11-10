// Painel lateral com os detalhes de uma divisão (abre ao clicar numa sala da casa 3D).
// Mostra os sensores e permite controlar os atuadores. Atualiza em tempo real enquanto
// está aberto, sem redesenhar os controlos que o utilizador está a usar.
import { SENSOR_TYPES, ACTUATOR_TYPES } from "../config/constants.js";
import { escapeHtml, formatValue, formatTime } from "../utils/format.js";
import { sensorStatus, zoneStatus, STATUS_COLOR } from "../utils/status.js";

const STATUS_TEXT = { ok: "Normal", warn: "Aviso", danger: "Perigo", unknown: "Sem dados" };
const SOURCE_TEXT = { node1: "Nó 1", node2: "Nó 2", sim: "Simulado" };

/**
 * @param {object} handlers
 *   onToggle(path, state)  ligar/desligar um atuador
 *   onLevel(path, level)   mudar o nível (0–100) de um atuador com nível
 *   onClose()              o painel foi fechado
 */
export function createRoomPanel({ onToggle, onLevel, onClose }) {
  const el = document.getElementById("room-panel");
  const offcanvas = bootstrap.Offcanvas.getOrCreateInstance(el);
  const $title = $("#room-panel-title");
  const $body = $("#room-panel-body");

  let zoneId = null;
  let structure = "";

  el.addEventListener("hidden.bs.offcanvas", () => {
    zoneId = null;
    structure = "";
    onClose?.();
  });

  // ---- Desenho ------------------------------------------------------------
  function sensorValueText(s) {
    const type = SENSOR_TYPES[s.type];
    if (type?.boolean) return s.value ? type.on : type.off;
    return formatValue(s.value, s.unit ?? type?.unit ?? "");
  }

  function sensorRow(id, s) {
    const st = sensorStatus(s);
    const type = SENSOR_TYPES[s.type] ?? { icon: "fa-circle-question", label: s.type };
    return `
      <li class="list-group-item d-flex justify-content-between align-items-center" data-sensor="${id}">
        <div>
          <i class="fa-solid ${type.icon} text-secondary me-2"></i>${escapeHtml(s.name)}
          <div class="small text-muted">${type.label} · ${SOURCE_TEXT[s.source] ?? ""} · <span class="js-time">${formatTime(s.updatedAt)}</span></div>
        </div>
        <span class="badge text-bg-${STATUS_COLOR[st]} fs-6 js-value">${escapeHtml(sensorValueText(s))}</span>
      </li>`;
  }

  function actuatorRow(id, a) {
    const type = ACTUATOR_TYPES[a.type] ?? { icon: "fa-circle-question", label: a.type };
    const path = `zones/${zoneId}/actuators/${id}`;
    const level = typeof a.level === "number" ? a.level : 100;
    return `
      <li class="list-group-item" data-actuator="${id}">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <i class="fa-solid ${type.icon} text-secondary me-2"></i>${escapeHtml(a.name)}
            <div class="small text-muted">${type.label} · ${SOURCE_TEXT[a.source] ?? ""}</div>
          </div>
          <div class="form-check form-switch m-0 fs-5">
            <input class="form-check-input js-switch" type="checkbox" role="switch" data-path="${path}" ${a.state ? "checked" : ""}>
          </div>
        </div>
        ${type.hasLevel ? `
          <div class="d-flex align-items-center gap-2 mt-2">
            <i class="fa-solid fa-gauge-simple text-secondary"></i>
            <input type="range" class="form-range js-level" min="0" max="100" step="5" value="${level}" data-path="${path}">
            <span class="small js-level-text" style="min-width:3rem">${level} %</span>
          </div>` : ""}
      </li>`;
  }

  function render(zone) {
    const st = zoneStatus(zone);
    $title.html(`<i class="fa-solid ${zone.icon ?? "fa-house"} me-2"></i>${escapeHtml(zone.name)}
      <span class="badge text-bg-${STATUS_COLOR[st]} ms-2 align-middle js-zone-status">${STATUS_TEXT[st]}</span>`);

    const sensors = Object.entries(zone.sensors ?? {});
    const actuators = Object.entries(zone.actuators ?? {});

    $body.html(`
      <h6 class="text-uppercase small text-muted">Sensores</h6>
      <ul class="list-group mb-4">
        ${sensors.length ? sensors.map(([id, s]) => sensorRow(id, s)).join("") : `<li class="list-group-item text-muted small">Sem sensores</li>`}
      </ul>
      <h6 class="text-uppercase small text-muted">Atuadores</h6>
      <ul class="list-group">
        ${actuators.length ? actuators.map(([id, a]) => actuatorRow(id, a)).join("") : `<li class="list-group-item text-muted small">Sem atuadores</li>`}
      </ul>
    `);
  }

  /** Atualiza só os valores, mantendo os controlos (não interrompe quem está a mexer). */
  function refreshValues(zone) {
    const st = zoneStatus(zone);
    $title.find(".js-zone-status")
      .attr("class", `badge text-bg-${STATUS_COLOR[st]} ms-2 align-middle js-zone-status`)
      .text(STATUS_TEXT[st]);

    for (const [id, s] of Object.entries(zone.sensors ?? {})) {
      const $row = $body.find(`[data-sensor="${id}"]`);
      $row.find(".js-value")
        .attr("class", `badge text-bg-${STATUS_COLOR[sensorStatus(s)]} fs-6 js-value`)
        .text(sensorValueText(s));
      $row.find(".js-time").text(formatTime(s.updatedAt));
    }
    for (const [id, a] of Object.entries(zone.actuators ?? {})) {
      const $row = $body.find(`[data-actuator="${id}"]`);
      $row.find(".js-switch").prop("checked", a.state === true);
      const $level = $row.find(".js-level");
      if ($level.length && !$level.is(":active") && typeof a.level === "number") {
        $level.val(a.level);
        $row.find(".js-level-text").text(`${a.level} %`);
      }
    }
  }

  // Assinatura da estrutura da sala (que dispositivos existem); se mudar, redesenha tudo
  const signatureOf = (zone) => JSON.stringify([
    zone.name, zone.icon,
    Object.entries(zone.sensors ?? {}).map(([id, s]) => [id, s.name, s.type]),
    Object.entries(zone.actuators ?? {}).map(([id, a]) => [id, a.name, a.type])
  ]);

  // ---- Eventos dos controlos ---------------------------------------------
  $body.on("change", ".js-switch", function () {
    onToggle?.($(this).data("path"), this.checked);
  });
  $body.on("input", ".js-level", function () {
    $(this).siblings(".js-level-text").text(`${this.value} %`);
  });
  $body.on("change", ".js-level", function () {
    onLevel?.($(this).data("path"), Number(this.value));
  });

  // ---- API ----------------------------------------------------------------
  return {
    open(id, zone) {
      zoneId = id;
      structure = signatureOf(zone);
      render(zone);
      offcanvas.show();
    },
    /** Chamado sempre que os dados mudam. */
    update(zones) {
      if (!zoneId) return;
      const zone = zones[zoneId];
      if (!zone) { offcanvas.hide(); return; } // a sala foi apagada
      const sig = signatureOf(zone);
      if (sig !== structure) { structure = sig; render(zone); }
      else refreshValues(zone);
    },
    close() { offcanvas.hide(); },
    get zoneId() { return zoneId; }
  };
}
