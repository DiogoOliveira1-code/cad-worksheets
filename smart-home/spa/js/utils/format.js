// Funções pequenas de formatação usadas por vários componentes.

export function formatValue(value, unit = "") {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") {
    const rounded = Number.isInteger(value) ? value : value.toFixed(1);
    return unit ? `${rounded} ${unit}` : `${rounded}`;
  }
  return unit ? `${value} ${unit}` : `${value}`;
}

export function formatTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleString("pt-PT");
}

/** Gera um id legível a partir de um nome: "Quarto Principal" -> "quarto_principal" */
export function slugify(text) {
  return text
    .toString()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * "Assinatura" da estrutura das divisões (ids e nomes, sem valores).
 * Serve para só redesenhar formulários quando se adiciona/remove algo,
 * e não a cada nova leitura de sensor.
 */
export function zonesSignature(zones) {
  return JSON.stringify(Object.entries(zones ?? {}).map(([id, z]) => [
    id, z.name,
    Object.entries(z.sensors ?? {}).map(([sid, s]) => [sid, s.name]),
    Object.entries(z.actuators ?? {}).map(([aid, a]) => [aid, a.name])
  ]));
}

/** Evita injeção de HTML em textos escritos pelo utilizador. */
export function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Converte o texto de um input para boolean/número quando faz sentido. */
export function parseInputValue(text) {
  if (text === "true") return true;
  if (text === "false") return false;
  const n = Number(text);
  return text !== "" && !isNaN(n) ? n : text;
}

/** Mostra um toast Bootstrap. */
export function toast(message, type = "success") {
  const $t = $(`
    <div class="toast align-items-center text-bg-${type} border-0" role="alert">
      <div class="d-flex">
        <div class="toast-body">${escapeHtml(message)}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>`);
  $("#toast-area").append($t);
  const t = new bootstrap.Toast($t[0], { delay: 3000 });
  $t.on("hidden.bs.toast", () => $t.remove());
  t.show();
}
