// Linha de um sensor dentro do cartão de uma divisão.
import { SENSOR_TYPES } from "../config/constants.js";
import { formatValue, formatTime, escapeHtml } from "../utils/format.js";

export function sensorItem(id, sensor) {
  const type = SENSOR_TYPES[sensor.type] ?? { icon: "fa-circle-question", unit: "" };

  let display;
  if (type.boolean) {
    const active = sensor.value === true;
    display = `<span class="badge text-bg-${active ? "warning" : "secondary"}">${active ? type.on : type.off}</span>`;
  } else {
    display = `<strong>${formatValue(sensor.value, sensor.unit ?? type.unit)}</strong>`;
  }

  return `
    <div class="device-row" data-sensor-id="${id}">
      <div class="device-name">
        <i class="fa-solid ${type.icon}"></i> ${escapeHtml(sensor.name)}
        ${sensor.simulated === false ? `<span class="badge text-bg-info badge-real ms-1">real</span>` : ""}
        <div class="updated-at">${formatTime(sensor.updatedAt)}</div>
      </div>
      <div>${display}</div>
    </div>`;
}
