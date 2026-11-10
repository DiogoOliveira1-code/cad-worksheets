// Item da lista de regras, com resumo legível das condições e ações.
import { escapeHtml } from "../utils/format.js";

function describeCondition(c) {
  return `<code>${escapeHtml(c.path)}</code> ${escapeHtml(c.operator)} <strong>${escapeHtml(c.value)}</strong>`;
}

function describeAction(a) {
  if (a.type === "alert") return `alerta: "${escapeHtml(a.message)}"`;
  return `<code>${escapeHtml(a.path)}</code> → <strong>${a.state ? "ON" : "OFF"}</strong>`;
}

export function ruleItem(id, rule) {
  const conditions = (rule.conditions ?? []).map(describeCondition).join(` <em>${rule.logic ?? "AND"}</em> `);
  const actions = (rule.actions ?? []).map(describeAction).join(", ");

  return `
    <div class="list-group-item" data-rule-id="${id}">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <strong>${escapeHtml(rule.name)}</strong>
          <div class="small mt-1"><span class="text-muted">SE</span> ${conditions}</div>
          <div class="small"><span class="text-muted">ENTÃO</span> ${actions}</div>
        </div>
        <div class="d-flex align-items-center gap-2">
          <div class="form-check form-switch m-0">
            <input class="form-check-input js-toggle-rule" type="checkbox" data-id="${id}" ${rule.enabled ? "checked" : ""}>
          </div>
          <button class="btn btn-sm btn-outline-danger js-delete-rule" data-id="${id}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    </div>`;
}
