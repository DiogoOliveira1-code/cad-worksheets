// Ecrã 2 — Regras de automação + alertas.
// Requisito e). A SPA só guarda as regras na BD; quem as executa é o iot-app (rules-engine.js).
import { listen, listenLast, add, patch, removePath } from "../services/data.js";
import { DB, OPERATORS, EXTERNAL_FIELDS } from "../config/constants.js";
import { ruleItem } from "../components/rule-item.js";
import { escapeHtml, formatDateTime, parseInputValue, toast, zonesSignature } from "../utils/format.js";

let zones = {};

/** Opções de "fonte" para condições: todos os sensores + dados externos. */
function conditionSourceOptions() {
  let html = `<optgroup label="Sensores">`;
  for (const [zId, z] of Object.entries(zones)) {
    for (const [sId, s] of Object.entries(z.sensors ?? {})) {
      html += `<option value="sensor|zones/${zId}/sensors/${sId}/value">${escapeHtml(z.name)} · ${escapeHtml(s.name)}</option>`;
    }
  }
  html += `</optgroup><optgroup label="Exterior (APIs)">`;
  for (const [path, label] of Object.entries(EXTERNAL_FIELDS)) {
    html += `<option value="external|${path}">${escapeHtml(label)}</option>`;
  }
  return html + `</optgroup>`;
}

/** Opções de ação: todos os atuadores + gerar alerta. */
function actionTargetOptions() {
  let html = `<optgroup label="Atuadores">`;
  for (const [zId, z] of Object.entries(zones)) {
    for (const [aId, a] of Object.entries(z.actuators ?? {})) {
      html += `<option value="actuator|zones/${zId}/actuators/${aId}/state">${escapeHtml(z.name)} · ${escapeHtml(a.name)}</option>`;
    }
  }
  return html + `</optgroup><option value="alert|">Gerar alerta</option>`;
}

function conditionRow() {
  return `
    <div class="condition-row">
      <div class="row g-2">
        <div class="col-12"><select class="form-select form-select-sm js-cond-source">${conditionSourceOptions()}</select></div>
        <div class="col-4"><select class="form-select form-select-sm js-cond-op">${OPERATORS.map((o) => `<option>${o}</option>`).join("")}</select></div>
        <div class="col-6"><input class="form-control form-control-sm js-cond-value" placeholder="valor (ex.: 25 ou true)" required></div>
        <div class="col-2"><button type="button" class="btn btn-sm btn-outline-secondary w-100 js-remove-row">×</button></div>
      </div>
    </div>`;
}

function actionRow() {
  return `
    <div class="action-row">
      <div class="row g-2">
        <div class="col-12"><select class="form-select form-select-sm js-act-target">${actionTargetOptions()}</select></div>
        <div class="col-10">
          <select class="form-select form-select-sm js-act-state">
            <option value="true">Ligar (ON)</option>
            <option value="false">Desligar (OFF)</option>
          </select>
          <input class="form-control form-control-sm js-act-message d-none" placeholder="mensagem do alerta">
        </div>
        <div class="col-2"><button type="button" class="btn btn-sm btn-outline-secondary w-100 js-remove-row">×</button></div>
      </div>
    </div>`;
}

function renderForm() {
  $("#rule-form").html(`
    <div class="mb-2">
      <label class="form-label small">Nome</label>
      <input id="rule-name" class="form-control form-control-sm" required>
    </div>
    <div class="mb-2">
      <label class="form-label small">Lógica entre condições</label>
      <select id="rule-logic" class="form-select form-select-sm">
        <option value="AND">Todas (E)</option>
        <option value="OR">Qualquer uma (OU)</option>
      </select>
    </div>
    <label class="form-label small">SE</label>
    <div id="conditions">${conditionRow()}</div>
    <button type="button" id="add-condition" class="btn btn-sm btn-link px-0">+ condição</button>

    <label class="form-label small d-block mt-2">ENTÃO</label>
    <div id="actions">${actionRow()}</div>
    <button type="button" id="add-action" class="btn btn-sm btn-link px-0">+ ação</button>

    <button class="btn btn-primary w-100 mt-3" type="submit"><i class="fa-solid fa-floppy-disk me-1"></i>Guardar regra</button>
  `);
}

function readForm() {
  const conditions = $("#conditions .condition-row").map(function () {
    const [source, path] = $(this).find(".js-cond-source").val().split("|");
    return {
      source,
      path,
      operator: $(this).find(".js-cond-op").val(),
      value: parseInputValue($(this).find(".js-cond-value").val().trim())
    };
  }).get();

  const actions = $("#actions .action-row").map(function () {
    const [type, path] = $(this).find(".js-act-target").val().split("|");
    if (type === "alert") {
      return { type, message: $(this).find(".js-act-message").val().trim() || "Alerta", level: "warning" };
    }
    return { type, path, state: $(this).find(".js-act-state").val() === "true" };
  }).get();

  return {
    name: $("#rule-name").val().trim(),
    enabled: true,
    logic: $("#rule-logic").val(),
    conditions,
    actions,
    createdAt: new Date().toISOString()
  };
}

function bindFormEvents() {
  const $form = $("#rule-form");

  $form.on("click", "#add-condition", () => $("#conditions").append(conditionRow()));
  $form.on("click", "#add-action", () => $("#actions").append(actionRow()));
  $form.on("click", ".js-remove-row", function () {
    const $row = $(this).closest(".condition-row, .action-row");
    if ($row.siblings().length) $row.remove(); // mantém pelo menos uma linha
  });

  // Alterna entre "estado do atuador" e "mensagem do alerta"
  $form.on("change", ".js-act-target", function () {
    const isAlert = $(this).val().startsWith("alert|");
    const $row = $(this).closest(".action-row");
    $row.find(".js-act-state").toggleClass("d-none", isAlert);
    $row.find(".js-act-message").toggleClass("d-none", !isAlert);
  });

  $form.on("submit", async (e) => {
    e.preventDefault();
    const rule = readForm();
    if (!rule.name) return toast("Indique um nome para a regra", "warning");
    try {
      await add(DB.RULES, rule);
      toast("Regra guardada");
      renderForm();
    } catch (err) {
      toast("Erro ao guardar regra: " + err.message, "danger");
    }
  });
}

function bindListEvents() {
  $("#rules-list").on("change", ".js-toggle-rule", function () {
    patch(`${DB.RULES}/${$(this).data("id")}`, { enabled: this.checked });
  });
  $("#rules-list").on("click", ".js-delete-rule", function () {
    if (confirm("Apagar esta regra?")) removePath(`${DB.RULES}/${$(this).data("id")}`);
  });
}

export function initRules() {
  renderForm();
  bindFormEvents();
  bindListEvents();

  // As opções do formulário dependem dos dispositivos existentes
  let signature = "";
  listen(DB.ZONES, (data) => {
    zones = data ?? {};
    const sig = zonesSignature(zones);
    if (sig !== signature) {
      signature = sig;
      renderForm();
    }
  });

  listen(DB.RULES, (rules) => {
    const entries = Object.entries(rules ?? {});
    $("#rules-list").html(
      entries.length ? entries.map(([id, r]) => ruleItem(id, r)).join("") : `<p class="text-muted">Sem regras.</p>`
    );
  });

  listenLast(DB.ALERTS, 10, (alerts) => {
    const list = Object.values(alerts).reverse();
    $("#alerts-list").html(
      list.length
        ? list.map((a) => `
            <div class="list-group-item list-group-item-${a.level ?? "warning"}">
              <i class="fa-solid fa-bell me-1"></i>${escapeHtml(a.message)}
              <div class="small">${formatDateTime(a.createdAt)}</div>
            </div>`).join("")
        : `<p class="text-muted">Sem alertas.</p>`
    );
  });
}
