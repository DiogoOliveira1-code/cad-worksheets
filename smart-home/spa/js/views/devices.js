// Ecrã 3 — Editor da casa.
//   - adicionar, mover, redimensionar e remover divisões (adenda da Época Normal)
//   - adicionar, mover e remover sensores e atuadores em cada divisão (enunciado, 3.º ecrã)
// O desenho 3D e o rato/toque estão em scene3d/editor/; aqui ficam os dados e os formulários.
import { listen, write, patch, removePath } from "../services/data.js";
import { DB, SENSOR_TYPES, ACTUATOR_TYPES, ROOM_TYPES, DEVICE_SOURCES } from "../config/constants.js";
import { escapeHtml, slugify, toast } from "../utils/format.js";

const HINTS = {
  select: "Clique para selecionar · arraste para mover · cantos azuis redimensionam · botão direito desloca",
  draw: "Arraste na grelha para desenhar a divisão",
  place: "Clique dentro de uma divisão para colocar o dispositivo"
};

let zones = {};
let editor = null;
let pendingLayout = null; // divisão desenhada à espera de nome/tipo
let roomModal = null;

const now = () => new Date().toISOString();
const label = (kind, type) => (kind === "sensors" ? SENSOR_TYPES : ACTUATOR_TYPES)[type]?.label ?? type;

// ---- Modo e paleta ----------------------------------------------------------
function setMode(mode, pending = null) {
  editor?.setMode(mode, pending);
  $("#editor-tools .btn").removeClass("active");
  $(`#editor-tools [data-mode="${mode}"]`).addClass("active");
  $("#device-palette .btn").removeClass("active");
  if (pending) $(`#device-palette [data-kind="${pending.kind}"][data-type="${pending.type}"]`).addClass("active");
  $("#editor-hint").text(HINTS[mode]);
}

function renderPalette() {
  const group = (title, kind, types) => `
    <div class="palette-group">
      <div class="small text-muted text-uppercase mb-1">${title}</div>
      <div class="d-grid gap-1">
        ${Object.entries(types).map(([type, t]) => `
          <button type="button" class="btn btn-sm btn-outline-secondary" data-kind="${kind}" data-type="${type}">
            <i class="fa-solid ${t.icon} me-2" style="width:1.1rem"></i>${t.label}
          </button>`).join("")}
      </div>
    </div>`;
  $("#device-palette").html(group("Sensores", "sensors", SENSOR_TYPES) + group("Atuadores", "actuators", ACTUATOR_TYPES));
}

// ---- Propriedades -----------------------------------------------------------
function renderProps() {
  const sel = editor?.selection;
  const $p = $("#editor-props");

  if (!sel || !zones[sel.zoneId]) {
    $p.html(`<p class="small text-muted m-0">
      Selecione uma divisão ou um dispositivo na planta.<br><br>
      Para criar uma divisão, use <strong>Nova divisão</strong> e arraste na grelha.
      Para adicionar um dispositivo, escolha-o na lista e clique dentro de uma divisão.</p>`);
    return;
  }

  const zone = zones[sel.zoneId];

  if (sel.type === "room") {
    const l = zone.layout ?? {};
    const nDevices = Object.keys(zone.sensors ?? {}).length + Object.keys(zone.actuators ?? {}).length;
    $p.html(`
      <div class="mb-2">
        <label class="form-label small">Nome</label>
        <input class="form-control form-control-sm" id="prop-room-name" value="${escapeHtml(zone.name)}">
      </div>
      <div class="mb-2">
        <label class="form-label small">Tipo</label>
        <select class="form-select form-select-sm" id="prop-room-type">
          ${Object.entries(ROOM_TYPES).map(([k, t]) => `<option value="${k}" ${zone.roomType === k ? "selected" : ""}>${t.label}</option>`).join("")}
        </select>
      </div>
      <p class="small text-muted mb-3">
        ${l.w} × ${l.h} m · posição (${l.x}, ${l.y}) · ${nDevices} dispositivo(s)
      </p>
      <button class="btn btn-sm btn-outline-danger w-100" id="prop-delete"><i class="fa-solid fa-trash me-1"></i>Apagar divisão</button>
    `);
    return;
  }

  const d = zone[sel.kind]?.[sel.id];
  if (!d) { $p.empty(); return; }
  const types = sel.kind === "sensors" ? SENSOR_TYPES : ACTUATOR_TYPES;
  const source = d.source ?? (d.simulated === false ? "node1" : "sim");
  $p.html(`
    <div class="mb-2 small text-muted">
      <i class="fa-solid ${types[d.type]?.icon ?? "fa-circle"} me-1"></i>
      ${sel.kind === "sensors" ? "Sensor" : "Atuador"} · ${label(sel.kind, d.type)} · ${escapeHtml(zone.name)}
    </div>
    <div class="mb-2">
      <label class="form-label small">Nome</label>
      <input class="form-control form-control-sm" id="prop-device-name" value="${escapeHtml(d.name)}">
    </div>
    <div class="mb-3">
      <label class="form-label small">Origem dos dados</label>
      <select class="form-select form-select-sm" id="prop-device-source">
        ${Object.entries(DEVICE_SOURCES).map(([k, t]) => `<option value="${k}" ${source === k ? "selected" : ""}>${t}</option>`).join("")}
      </select>
    </div>
    <button class="btn btn-sm btn-outline-danger w-100" id="prop-delete"><i class="fa-solid fa-trash me-1"></i>Remover dispositivo</button>
  `);
}

function selectionPath(sel) {
  return sel.type === "room"
    ? `${DB.ZONES}/${sel.zoneId}`
    : `${DB.ZONES}/${sel.zoneId}/${sel.kind}/${sel.id}`;
}

async function deleteSelection(sel) {
  if (!sel) return;
  const zone = zones[sel.zoneId];
  const what = sel.type === "room"
    ? `a divisão "${zone?.name}" e todos os seus dispositivos`
    : `"${zone?.[sel.kind]?.[sel.id]?.name}"`;
  if (!confirm(`Remover ${what}?`)) return;
  await removePath(selectionPath(sel));
  editor.select(null);
  toast("Removido");
}

// ---- Criar ------------------------------------------------------------------
function uniqueZoneId(name) {
  const base = slugify(name) || "divisao";
  let id = base;
  for (let i = 2; zones[id]; i++) id = `${base}_${i}`;
  return id;
}

function openRoomModal(layout) {
  pendingLayout = layout;
  $("#room-modal-name").val("");
  $("#room-modal-type").val("living");
  $("#room-modal-size").text(`${layout.w} × ${layout.h} m`);
  roomModal.show();
}

async function createRoom() {
  const name = $("#room-modal-name").val().trim();
  if (!name || !pendingLayout) return;
  const roomType = $("#room-modal-type").val();
  const id = uniqueZoneId(name);
  const order = Object.keys(zones).length + 1;

  await write(`${DB.ZONES}/${id}`, {
    name, roomType, icon: ROOM_TYPES[roomType].icon, order, layout: pendingLayout
  });
  pendingLayout = null;
  roomModal.hide();
  setMode("select");
  editor.select({ type: "room", zoneId: id });
  toast(`Divisão "${name}" criada`);
}

async function placeDevice(zoneId, pos, { kind, type }) {
  const id = `${zoneId}_${type}_${Date.now().toString(36)}`;
  const count = Object.values(zones[zoneId]?.[kind] ?? {}).filter((d) => d.type === type).length;
  const name = count ? `${label(kind, type)} ${count + 1}` : label(kind, type);
  const base = { type, name, simulated: true, source: "sim", pos, updatedAt: now() };

  if (kind === "sensors") {
    const t = SENSOR_TYPES[type];
    await write(`${DB.ZONES}/${zoneId}/sensors/${id}`, { ...base, unit: t.unit, value: t.boolean ? false : null });
  } else {
    const t = ACTUATOR_TYPES[type];
    await write(`${DB.ZONES}/${zoneId}/actuators/${id}`, { ...base, state: false, ...(t.hasLevel ? { level: 50 } : {}) });
  }
  setMode("select");
  editor.select({ type: "device", zoneId, kind, id });
  toast(`"${name}" adicionado a ${zones[zoneId].name}`);
}

// ---- Eventos dos formulários ---------------------------------------------------
function bindEvents() {
  $("#editor-tools").on("click", "[data-mode]", function () { setMode($(this).data("mode")); });
  $("#editor-frame").on("click", () => editor?.frameAll());

  $("#device-palette").on("click", "[data-kind]", function () {
    const pending = { kind: $(this).data("kind"), type: $(this).data("type") };
    if (!Object.keys(zones).length) return toast("Crie primeiro uma divisão", "warning");
    setMode("place", pending);
  });

  $("#room-modal-type").html(Object.entries(ROOM_TYPES).map(([k, t]) => `<option value="${k}">${t.label}</option>`).join(""));
  $("#room-modal-form").on("submit", (e) => { e.preventDefault(); createRoom(); });
  document.getElementById("room-modal").addEventListener("shown.bs.modal", () => $("#room-modal-name").trigger("focus"));

  const $p = $("#editor-props");
  $p.on("change", "#prop-room-name", function () {
    const name = this.value.trim();
    if (name) patch(selectionPath(editor.selection), { name });
  });
  $p.on("change", "#prop-room-type", function () {
    patch(selectionPath(editor.selection), { roomType: this.value, icon: ROOM_TYPES[this.value].icon });
  });
  $p.on("change", "#prop-device-name", function () {
    const name = this.value.trim();
    if (name) patch(selectionPath(editor.selection), { name });
  });
  $p.on("change", "#prop-device-source", function () {
    patch(selectionPath(editor.selection), { source: this.value, simulated: this.value === "sim" });
  });
  $p.on("click", "#prop-delete", () => deleteSelection(editor.selection));
}

// ---- Arranque ---------------------------------------------------------------
// O 3D do editor só existe enquanto o ecrã "Dispositivos" está aberto: assim nunca há
// dois motores 3D a usar a placa gráfica ao mesmo tempo.
const isEditorRoute = () => location.hash === "#dispositivos";
let starting = false;

async function initEditor() {
  if (editor || starting) return;
  starting = true;
  try {
    const { createEditor } = await import("../scene3d/editor/editor-mode.js");
    editor = createEditor(document.getElementById("editor-3d"), {
      onRoomDrawn: openRoomModal,
      onRoomChanged: (zoneId, layout) => patch(`${DB.ZONES}/${zoneId}`, { layout }),
      onDevicePlaced: placeDevice,
      onDeviceMoved: (zoneId, kind, id, pos) => patch(`${DB.ZONES}/${zoneId}/${kind}/${id}`, { pos }),
      onSelect: renderProps,
      onDeleteKey: deleteSelection
    });
    editor.setZones(zones);
    setMode("select");
    // Se entretanto o utilizador já saiu do ecrã, liberta logo
    if (!isEditorRoute()) disposeEditor();
  } catch (err) {
    console.error("[editor] não foi possível iniciar o editor 3D:", err);
    $("#editor-3d").html(`<div class="house-3d-error">Não foi possível mostrar o editor neste browser.</div>`);
  } finally {
    starting = false;
  }
}

function disposeEditor() {
  if (!editor) return;
  editor.dispose();
  editor = null;
  renderProps();
}

function onRoute() {
  if (isEditorRoute()) initEditor();
  else disposeEditor();
}

export function initDevices() {
  roomModal = bootstrap.Modal.getOrCreateInstance(document.getElementById("room-modal"));
  renderPalette();
  bindEvents();
  renderProps();
  window.addEventListener("hashchange", onRoute);
  onRoute();

  listen(DB.ZONES, (data) => {
    zones = data ?? {};
    editor?.setZones(zones);
    // Mantém o formulário de propriedades atualizado, exceto enquanto se escreve nele
    if (!$("#editor-props").find(":focus").length) renderProps();
  });
}
