// Motor de regras (requisito e). Corre no IoT para a automação funcionar
// mesmo sem nenhuma SPA aberta.
//
// Regra (em /rules/{id}):
//   { name, enabled, logic: "AND"|"OR",
//     conditions: [{ source, path, operator, value }],
//     actions:    [{ type: "actuator", path, state } | { type: "alert", message, level }] }
//
// As ações só disparam quando a regra passa de "falsa" para "verdadeira"
// (deteção de flanco), para não repetir alertas nem escrever na BD a cada ciclo.
const { ref, db, now } = require("../firebase");
const config = require("../config");

let rules = {};
let state = { zones: {}, external: {} };
const lastResult = new Map(); // ruleId -> boolean

/** Lê um valor por caminho, ex.: "zones/sala/sensors/sala_temp/value" */
function getByPath(obj, path) {
  return path.split("/").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function compare(a, operator, b) {
  switch (operator) {
    case "==": return a === b;
    case "!=": return a !== b;
    case ">":  return a > b;
    case ">=": return a >= b;
    case "<":  return a < b;
    case "<=": return a <= b;
    default:   return false;
  }
}

function evaluateRule(rule) {
  const conditions = rule.conditions ?? [];
  if (!conditions.length) return false;

  const results = conditions.map((c) => {
    const current = getByPath(state, c.path);
    if (current === undefined || current === null) return false;
    return compare(current, c.operator, c.value);
  });

  return rule.logic === "OR" ? results.some(Boolean) : results.every(Boolean);
}

async function runActions(ruleId, rule) {
  for (const action of rule.actions ?? []) {
    if (action.type === "actuator") {
      const actuatorPath = action.path.replace(/\/state$/, "");
      if (getByPath(state, action.path) === action.state) continue;
      await ref(actuatorPath).update({ state: action.state, updatedAt: now() });
      console.log(`[rules] "${rule.name}": ${actuatorPath} -> ${action.state ? "ON" : "OFF"}`);
    } else if (action.type === "alert") {
      await ref("alerts").push({ message: action.message, level: action.level ?? "warning", ruleId, createdAt: now() });
      console.log(`[rules] "${rule.name}": alerta "${action.message}"`);
    }
  }
}

async function evaluateAll() {
  for (const [id, rule] of Object.entries(rules)) {
    if (!rule.enabled) { lastResult.delete(id); continue; }

    const result = evaluateRule(rule);
    const previous = lastResult.get(id) ?? false;
    lastResult.set(id, result);

    if (result && !previous) {
      try {
        await runActions(id, rule);
      } catch (err) {
        console.error(`[rules] erro na regra ${id}:`, err.message);
      }
    }
  }

  // Esquecer regras apagadas
  for (const id of lastResult.keys()) if (!rules[id]) lastResult.delete(id);
}

function start() {
  ref("rules").on("value", (s) => { rules = s.val() ?? {}; });
  ref("zones").on("value", (s) => { state.zones = s.val() ?? {}; });
  ref("external").on("value", (s) => { state.external = s.val() ?? {}; });

  setInterval(() => evaluateAll(), config.rulesEvaluationInterval);
  console.log("[rules] motor de regras ativo");
}

module.exports = { start, evaluateRule, getByPath, compare };
