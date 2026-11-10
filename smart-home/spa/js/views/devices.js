// Ecrã 3 — Adicionar/remover sensores e atuadores por divisão,
// e adicionar novas divisões (adenda da Época Normal).
import { listen, write, removePath } from "../services/data.js";
import { DB, SENSOR_TYPES, ACTUATOR_TYPES, ZONE_ICONS } from "../config/constants.js";
import { escapeHtml, slugify, toast, zonesSignature } from "../utils/format.js";

let zones = {};

function renderZoneForm() {
  $("#zone-form").html(`
    <div class="mb-2">
      <label class="form-label small">Nome</label>
      <input id="zone-name" class="form-control form-control-sm" placeholder="ex.: Quarto" required>
    </div>
    <div class="mb-2">
      <label class="form-label small">Ícone</label>
      <select id="zone-icon" class="form-select form-select-sm">
        ${ZONE_ICONS.map((i) => `<option value="${i}">${i.replace("fa-", "")}</option>`).join("")}
      </select>
    </div>
    <button class="btn btn-primary btn-sm w-100" type="submit">Adicionar divisão</button>
  `);
}

function renderDeviceForm() {
  const zoneOptions = Object.entries(zones)
    .map(([id, z]) => `<option value="${id}">${escapeHtml(z.name)}</option>`).join("");
  const sensorOptions = Object.entries(SENSOR_TYPES)
    .map(([k, t]) => `<option value="sensor|${k}">Sensor · ${t.label}</option>`).join("");
  const actuatorOptions = Object.entries(ACTUATOR_TYPES)
    .map(([k, t]) => `<option value="actuator|${k}">Atuador · ${t.label}</option>`).join("");

  $("#device-form").html(`
    <div class="mb-2">
      <label class="form-label small">Divisão</label>
      <select id="device-zone" class="form-select form-select-sm" required>${zoneOptions}</select>
    </div>
    <div class="mb-2">
      <label class="form-label small">Tipo</label>
      <select id="device-type" class="form-select form-select-sm">${sensorOptions}${actuatorOptions}</select>
    </div>
    <div class="mb-2">
      <label class="form-label small">Nome</label>
      <input id="device-name" class="form-control form-control-sm" required>
    </div>
    <div class="form-check mb-2">
      <input class="form-check-input" type="checkbox" id="device-real">
      <label class="form-check-label small" for="device-real">Dispositivo real (ligado ao GPIO)</label>
    </div>
    <div class="mb-2 d-none" id="device-gpio-group">
      <label class="form-label small">Pino GPIO (BCM)</label>
      <input id="device-gpio" type="number" min="0" max="27" class="form-control form-control-sm">
    </div>
    <button class="btn btn-primary btn-sm w-100" type="submit">Adicionar dispositivo</button>
  `);
}

function renderList() {
  const entries = Object.entries(zones).sort(([, a], [, b]) => (a.order ?? 99) - (b.order ?? 99));
  if (!entries.length) {
    $("#devices-list").html(`<p class="text-muted">Sem divisões.</p>`);
    return;
  }

  $("#devices-list").html(entries.map(([zId, z]) => {
    const rows = [
      ...Object.entries(z.sensors ?? {}).map(([id, d]) => ({ id, d, kind: "sensors", label: SENSOR_TYPES[d.type]?.label })),
      ...Object.entries(z.actuators ?? {}).map(([id, d]) => ({ id, d, kind: "actuators", label: ACTUATOR_TYPES[d.type]?.label }))
    ];
    return `
      <div class="card mb-3">
        <div class="card-header d-flex justify-content-between align-items-center">
          <span><i class="fa-solid ${z.icon ?? "fa-house"} me-2"></i>${escapeHtml(z.name)}</span>
          <button class="btn btn-sm btn-outline-danger js-delete" data-path="${DB.ZONES}/${zId}" data-label="a divisão ${escapeHtml(z.name)}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
        <ul class="list-group list-group-flush">
          ${rows.length ? rows.map(({ id, d, kind, label }) => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
              <span>
                ${escapeHtml(d.name)} <span class="text-muted small">(${kind === "sensors" ? "sensor" : "atuador"} · ${label ?? d.type})</span>
                ${d.simulated === false ? `<span class="badge text-bg-info ms-1">GPIO ${d.gpio ?? "?"}</span>` : `<span class="badge text-bg-light ms-1">simulado</span>`}
              </span>
              <button class="btn btn-sm btn-outline-danger js-delete" data-path="${DB.ZONES}/${zId}/${kind}/${id}" data-label="${escapeHtml(d.name)}">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </li>`).join("") : `<li class="list-group-item text-muted small">Sem dispositivos</li>`}
        </ul>
      </div>`;
  }).join(""));
}

function bindEvents() {
  $("#zone-form").on("submit", async (e) => {
    e.preventDefault();
    const name = $("#zone-name").val().trim();
    const id = slugify(name);
    if (!id) return toast("Nome inválido", "warning");
    if (zones[id]) return toast("Já existe uma divisão com esse nome", "warning");

    const order = Object.keys(zones).length + 1;
    await write(`${DB.ZONES}/${id}`, { name, icon: $("#zone-icon").val(), order });
    toast(`Divisão "${name}" criada`);
    $("#zone-name").val("");
  });

  $("#device-form").on("change", "#device-real", function () {
    $("#device-gpio-group").toggleClass("d-none", !this.checked);
  });

  $("#device-form").on("submit", async (e) => {
    e.preventDefault();
    const zoneId = $("#device-zone").val();
    if (!zoneId) return toast("Crie primeiro uma divisão", "warning");

    const [kind, type] = $("#device-type").val().split("|");
    const name = $("#device-name").val().trim();
    const real = $("#device-real").is(":checked");
    const id = `${zoneId}_${slugify(name)}_${Date.now().toString(36)}`;

    const device = { type, name, simulated: !real, updatedAt: new Date().toISOString() };
    if (real) device.gpio = Number($("#device-gpio").val());

    if (kind === "sensor") {
      const t = SENSOR_TYPES[type];
      device.unit = t.unit;
      device.value = t.boolean ? false : null;
      await write(`${DB.ZONES}/${zoneId}/sensors/${id}`, device);
    } else {
      device.state = false;
      await write(`${DB.ZONES}/${zoneId}/actuators/${id}`, device);
    }
    toast(`"${name}" adicionado`);
    $("#device-name").val("");
  });

  $("#devices-list").on("click", ".js-delete", function () {
    if (confirm(`Remover ${$(this).data("label")}?`)) removePath($(this).data("path"));
  });
}

export function initDevices() {
  renderZoneForm();
  renderDeviceForm();
  bindEvents();

  let signature = "";
  listen(DB.ZONES, (data) => {
    zones = data ?? {};
    const sig = zonesSignature(zones);
    if (sig === signature) return; // só mudaram valores de sensores
    signature = sig;

    const selected = $("#device-zone").val();
    renderDeviceForm();
    if (selected && zones[selected]) $("#device-zone").val(selected);
    renderList();
  });
}
