// Calcula o estado visual de sensores e divisões: "ok" | "warn" | "danger" | "unknown".
// Os limites estão em config/constants.js (THRESHOLDS).
import { THRESHOLDS } from "../config/constants.js";

const RANK = { unknown: 0, ok: 1, warn: 2, danger: 3 };

export function sensorStatus(sensor) {
  const t = THRESHOLDS[sensor?.type];
  const v = sensor?.value;
  if (v === null || v === undefined) return "unknown";
  if (!t) return "ok";

  if (typeof v === "boolean") {
    return v && t.whenTrue ? t.whenTrue : "ok";
  }
  if (typeof v !== "number") return "ok";

  if (t.above) {
    if (v >= t.above.danger) return "danger";
    if (v >= t.above.warn) return "warn";
  }
  if (t.below) {
    if (v <= t.below.danger) return "danger";
    if (v <= t.below.warn) return "warn";
  }
  return "ok";
}

/** Estado de uma divisão = o pior estado entre os seus sensores. */
export function zoneStatus(zone) {
  let worst = "ok";
  for (const s of Object.values(zone?.sensors ?? {})) {
    const st = sensorStatus(s);
    if (RANK[st] > RANK[worst]) worst = st;
  }
  return worst;
}

/** Classe de cor Bootstrap correspondente a cada estado. */
export const STATUS_COLOR = { ok: "success", warn: "warning", danger: "danger", unknown: "secondary" };
