// Cartão de informação geral (ecrã principal).
import { escapeHtml } from "../utils/format.js";

export function infoCard({ icon, label, value, detail = "", color = "primary" }) {
  return `
    <div class="col-6 col-lg-3">
      <div class="card info-card h-100">
        <div class="card-body d-flex align-items-center gap-3">
          <div class="info-icon text-${color}"><i class="fa-solid ${icon}"></i></div>
          <div>
            <div class="text-muted small">${escapeHtml(label)}</div>
            <div class="info-value">${escapeHtml(value)}</div>
            ${detail ? `<div class="small text-muted">${escapeHtml(detail)}</div>` : ""}
          </div>
        </div>
      </div>
    </div>`;
}
