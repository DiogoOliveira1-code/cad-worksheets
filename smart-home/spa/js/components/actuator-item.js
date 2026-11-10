// Linha de um atuador com botão ON/OFF.
// O botão tem data-path para a view saber onde escrever na BD.
import { ACTUATOR_TYPES } from "../config/constants.js";
import { escapeHtml } from "../utils/format.js";

export function actuatorItem(zoneId, id, actuator) {
  const type = ACTUATOR_TYPES[actuator.type] ?? { icon: "fa-circle-question" };
  const on = actuator.state === true;
  const label = on ? (type.on ?? "ON") : (type.off ?? "OFF");

  return `
    <div class="device-row" data-actuator-id="${id}">
      <div class="device-name">
        <i class="fa-solid ${type.icon}"></i> ${escapeHtml(actuator.name)}
        ${actuator.simulated === false ? `<span class="badge text-bg-info badge-real ms-1">real</span>` : ""}
      </div>
      <div class="d-flex align-items-center gap-2">
        <span class="badge text-bg-${on ? "success" : "secondary"}">${label}</span>
        <button class="btn btn-sm btn-outline-${on ? "danger" : "success"} js-toggle-actuator"
                data-path="zones/${zoneId}/actuators/${id}"
                data-state="${on}">
          <i class="fa-solid fa-power-off"></i>
        </button>
      </div>
    </div>`;
}
