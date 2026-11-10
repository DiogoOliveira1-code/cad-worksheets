// Cartão de uma divisão com os seus sensores e atuadores.
import { sensorItem } from "./sensor-item.js";
import { actuatorItem } from "./actuator-item.js";
import { escapeHtml } from "../utils/format.js";

export function zoneCard(zoneId, zone) {
  const sensors = Object.entries(zone.sensors ?? {});
  const actuators = Object.entries(zone.actuators ?? {});

  return `
    <div class="col-md-6 col-xl-4">
      <div class="card zone-card h-100">
        <div class="card-header">
          <i class="fa-solid ${zone.icon ?? "fa-house"} me-2"></i>${escapeHtml(zone.name)}
        </div>
        <div class="card-body">
          <h6 class="text-muted small text-uppercase">Sensores</h6>
          ${sensors.length ? sensors.map(([id, s]) => sensorItem(id, s)).join("") : `<p class="small text-muted">Sem sensores</p>`}

          <h6 class="text-muted small text-uppercase mt-3">Atuadores</h6>
          ${actuators.length ? actuators.map(([id, a]) => actuatorItem(zoneId, id, a)).join("") : `<p class="small text-muted">Sem atuadores</p>`}
        </div>
      </div>
    </div>`;
}
